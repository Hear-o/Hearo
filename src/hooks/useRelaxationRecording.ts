import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { AudioBufferSourceNode, AudioContext, AudioManager } from "react-native-audio-api";

import { activateAudioSession } from "@/lib/audio/audio-session";
import { audioWarn } from "@/lib/audio/audio-log";

const RECORDINGS = {
  en: require("@/assets/sounds/calming/relax-en.mp3"),
  he: require("@/assets/sounds/calming/relax-he.mp3"),
};

type PlaybackAttempt = {
  disposed: boolean;
  loaded: boolean;
  ctx: AudioContext | null;
  node: AudioBufferSourceNode | null;
  controls: Promise<void>;
  systemPaused: boolean;
  needsRecovery: boolean;
  interruptionSubscription: ReturnType<typeof AudioManager.addSystemEventListener> | null;
};

type Status = "loading" | "playing" | "paused" | "interrupted" | "error" | "finished";

/** Dedicated playback while the practice engine is suspended underneath.
 * Each focus/locale/retry owns its context, source and serialized controls.
 * Screen lock and Control Center do not pause narration. */
export function useRelaxationRecording(
  language: string,
  interrupted: boolean,
  onComplete: () => void,
  enabled = true,
) {
  const locale = language.startsWith("he") ? "he" : "en";
  const [status, setStatus] = useState<Status>("loading");
  const [paused, setPaused] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [foregroundKey, setForegroundKey] = useState(0);
  const [interruptionActive, setInterruptionActive] = useState(false);
  const currentRef = useRef<PlaybackAttempt | null>(null);
  const completeRef = useRef(onComplete);
  const suspended = paused || interrupted;
  const suspendedRef = useRef(suspended);

  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  useEffect(() => { suspendedRef.current = suspended; }, [suspended]);

  const dispose = useCallback((attempt: PlaybackAttempt) => {
    attempt.disposed = true;
    attempt.interruptionSubscription?.remove();
    if (currentRef.current === attempt) currentRef.current = null;
    if (attempt.node) {
      // Detach before stop/close, even if native emits an ended event on teardown.
      attempt.node.onEnded = null;
      try { attempt.node.stop(); } catch { /* Already finished or not started. */ }
      attempt.node.buffer = null;
    }
    if (attempt.ctx) {
      void Promise.resolve(attempt.ctx.close()).catch((error) => {
        audioWarn("relaxation recording: close failed", error);
      });
    }
  }, []);

  const fail = useCallback((attempt: PlaybackAttempt, error: unknown) => {
    if (attempt.disposed || currentRef.current !== attempt) return;
    audioWarn("relaxation recording: playback failed", error);
    dispose(attempt);
    setStatus("error");
  }, [dispose]);

  const syncPlayback = useCallback((attempt: PlaybackAttempt) => {
    // Native resume/suspend calls may finish in any order without this queue.
    // Read the latest intent when each queued command actually executes.
    attempt.controls = attempt.controls.then(async () => {
      if (attempt.disposed || !attempt.loaded) return;
      const ctx = attempt.ctx!;
      if (suspendedRef.current || attempt.systemPaused) {
        if ((await ctx.suspend()) === false) throw new Error("Audio suspension failed");
        if (!attempt.disposed) setStatus(attempt.systemPaused ? "interrupted" : "paused");
      } else {
        // Unlocking/closing Control Center must not reactivate an already
        // running context: activation can fail spuriously on iOS.
        if (ctx.state === "running" && !attempt.needsRecovery) {
          setStatus("playing");
          return;
        }
        // A shared engine may be paused while the context claims running.
        // Force the per-context driver through suspend before restarting it.
        if (attempt.needsRecovery && (await ctx.suspend()) === false) {
          throw new Error("Audio recovery suspension failed");
        }
        if (attempt.disposed || suspendedRef.current || attempt.systemPaused) return;
        const activated = await activateAudioSession();
        if (attempt.disposed || suspendedRef.current || attempt.systemPaused) return;
        if (!activated) throw new Error("Audio session unavailable");
        if ((await ctx.resume()) === false) throw new Error("Audio resume failed");
        if (!attempt.disposed && !suspendedRef.current && !attempt.systemPaused) {
          attempt.needsRecovery = false;
          setStatus("playing");
        }
      }
    }).catch((error) => fail(attempt, error));
  }, [fail]);

  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    const attempt: PlaybackAttempt = {
      disposed: false, loaded: false, ctx: null, node: null,
      controls: Promise.resolve(),
      systemPaused: false, needsRecovery: false, interruptionSubscription: null,
    };
    currentRef.current = attempt;
    setStatus("loading");
    setInterruptionActive(false);
    attempt.interruptionSubscription = AudioManager.addSystemEventListener("interruption", (event) => {
      if (attempt.disposed) return;
      // Latch both began and ended: shouldResume/context.state do not prove
      // shared-engine audibility, and an ended event may arrive without began.
      attempt.systemPaused = true;
      attempt.needsRecovery = true;
      setInterruptionActive(event.type === "began");
      setStatus("interrupted");
      syncPlayback(attempt);
    });

    void (async () => {
      try {
        // retryKey deliberately identifies a fresh playback attempt.
        void retryKey;
        const activated = await activateAudioSession();
        if (attempt.disposed) return;
        if (!activated) throw new Error("Audio session unavailable");
        const ctx = new AudioContext();
        attempt.ctx = ctx;
        if ((await ctx.suspend()) === false) throw new Error("Audio suspension failed");
        if (attempt.disposed) return;
        const buffer = await ctx.decodeAudioData(RECORDINGS[locale]);
        if (attempt.disposed) return;
        const node = ctx.createBufferSource();
        attempt.node = node;
        node.buffer = buffer;
        node.connect(ctx.destination);
        node.onEnded = () => {
          if (attempt.disposed) return;
          dispose(attempt);
          setStatus("finished");
          completeRef.current();
        };
        node.start();
        attempt.loaded = true;
        syncPlayback(attempt);
      } catch (error) {
        fail(attempt, error);
      }
    })();

    return () => {
      if (!attempt.disposed) dispose(attempt);
    };
  }, [enabled, locale, retryKey, dispose, fail, syncPlayback]));

  useEffect(() => {
    const attempt = currentRef.current;
    if (attempt) syncPlayback(attempt);
  }, [suspended, foregroundKey, syncPlayback]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      // Recover a suspended context; a running one is left untouched.
      if (state === "active") setForegroundKey((value) => value + 1);
    });
    return () => subscription.remove();
  }, []);

  return {
    status,
    paused,
    interruptionActive,
    resumeInterrupted: () => {
      const attempt = currentRef.current;
      if (!attempt) return;
      // Native platforms may omit ended. An explicit user action probes
      // recovery; a new began event can still re-latch the system pause.
      setInterruptionActive(false);
      attempt.systemPaused = false;
      setPaused(false);
      syncPlayback(attempt);
    },
    togglePause: () => setPaused((value) => !value),
    retry: () => { setPaused(false); setRetryKey((value) => value + 1); },
  };
}
