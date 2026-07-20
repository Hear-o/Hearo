import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

import { BreathingCircle } from "@/components/features/session/BreathingCircle";
import { ExitSessionConfirm } from "@/components/features/session/ExitSessionConfirm";
import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";
import { Icon } from "@/components/common/Icon";
import { SceneBackground } from "@/components/features/session/SceneBackground";
import { VoiceLine } from "@/components/features/session/VoiceLine";
import { useSessionStore } from "@/lib/storage/session-store";
import { getScene, getVoiceScript, localize, SceneKey, SCENE_ORDER, isPlaceholderSource, getAmbientTrack, getVoiceClips, getSound } from "@/lib/content/content";
import { dBToGain } from "@/lib/audio/audio-engine";
import { audioTrace, audioWarn } from "@/lib/audio/audio-log";
import { useCrisisStore } from "@/lib/storage/crisis-store";
import { fonts, tokens } from "@/lib/ui/tokens";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { usePulseMonitor, SessionState } from "@/hooks/usePulseMonitor";
import { ensureAssets, AssetManifest } from "@/lib/audio/asset-cache";

// ── Constants ────────────────────────────────────────────────────────────

// Every Practice scene is valid here — derive from SCENE_ORDER so newly-added
// scenes (v1.2.0 train/bus/quiet-bar/house-party/supermarket) route correctly
// instead of falling back to the default and rendering the wrong scene.
const VALID_SCENES: readonly SceneKey[] = SCENE_ORDER;

// Session zone durations. The session is split into three invisible regions:
//   INTRO       — first 30 s, no triggers, HR baseline collection
//   TRIGGER_ZONE — everything in between, triggers fire here
//   OUTRO       — last 30 s, no triggers, outro narration plays
// TODO(supabase): session_programs table — per-scene timing config.
const INTRO_DURATION_MS  = 30_000;
const OUTRO_DURATION_MS  = 30_000;

// One trigger per minute of trigger zone (2 / 4 / 6 for 3 / 5 / 7-min sessions).
const TRIGGERS_PER_MINUTE = 1;

// Fixed moderate/low trigger volume. Previously per-sound at -12 dB; reduced
// to -18 dB after on-device review found bursts too prominent at the old level.
const TRIGGER_PEAK_DB = -18;

function deriveSessionTiming(durationMinutes: number) {
  const totalMs = durationMinutes * 60 * 1000;
  const introMs = INTRO_DURATION_MS;
  const outroMs = OUTRO_DURATION_MS;
  const triggerZoneMs = totalMs - introMs - outroMs;
  const triggerCount = Math.max(1, Math.floor((triggerZoneMs / 60_000) * TRIGGERS_PER_MINUTE));
  const triggerIntervalMs = triggerZoneMs / triggerCount;
  return { totalMs, introMs, triggerZoneMs, outroMs, triggerCount, triggerIntervalMs };
}

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Burst shape constants.
// TODO(supabase): session_programs table — per-scene/per-sound timing config.
const TRIGGER_BURST_DURATION_MS = 8_000; // time at peak gain per burst
const TRIGGER_FADE_IN_MS = 1_500;        // onset ramp
const TRIGGER_FADE_OUT_MS = 1_500;       // offset ramp
// How far before each burst the lead-in heads-up caption should appear.
// v1.1.3: gives the brain a beat to anticipate the practice-moment instead
// of being startled by it cold.
const TRIGGER_LEAD_IN_MS = 4_000;

// How long the "back to the moment" caption stays on screen after a burst
// fades out. Tuned so the user finishes one breath cycle while reading it,
// then returns to the regular session text.
const POST_TRIGGER_CAPTION_MS = 10_000;

// Manual distress auto-return after 90 seconds (no watch / watch disconnected).
const MANUAL_RETURN_MS = 90_000;

// ── Session state machine ─────────────────────────────────────────────────

type MachineState = SessionState;

type Action =
  | { type: "ASSETS_READY" }
  | { type: "DISCLAIMER_DONE" }
  | { type: "INTRO_DONE" }
  | { type: "TRIGGER_ZONE_DONE" }
  | { type: "SESSION_END" }
  | { type: "WIND_DOWN_DONE" }
  | { type: "FEEDBACK_SUBMITTED" };

function sessionReducer(state: MachineState, action: Action): MachineState {
  switch (state) {
    case "LOADING":
      if (action.type === "ASSETS_READY") return "DISCLAIMER";
      // Allow exit during download — audio has not started, skip straight to post-session.
      if (action.type === "SESSION_END") return "POST_SESSION";
      break;
    case "DISCLAIMER":
      if (action.type === "DISCLAIMER_DONE") return "INTRO";
      // Allow exit before full audio engagement.
      if (action.type === "SESSION_END") return "POST_SESSION";
      break;
    case "INTRO":
      if (action.type === "INTRO_DONE") return "TRIGGER_ZONE";
      if (action.type === "SESSION_END") return "WIND_DOWN";
      break;
    case "TRIGGER_ZONE":
      if (action.type === "TRIGGER_ZONE_DONE") return "OUTRO";
      if (action.type === "SESSION_END") return "WIND_DOWN";
      break;
    case "OUTRO":
      if (action.type === "SESSION_END") return "WIND_DOWN";
      break;
    case "WIND_DOWN":
      if (action.type === "WIND_DOWN_DONE") return "POST_SESSION";
      break;
    case "POST_SESSION":
      // Navigation handled in useEffect; FEEDBACK_SUBMITTED reserved for feedback form.
      break;
  }
  return state;
}

// ── Helpers ───────────────────────────────────────────────────────────────


// ── Component ─────────────────────────────────────────────────────────────

export default function Session() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { scene: sceneParam } = useLocalSearchParams<{ scene?: string }>();
  const scene: SceneKey = VALID_SCENES.includes(sceneParam as SceneKey)
    ? (sceneParam as SceneKey)
    : "park";

  const consentedSounds = useSessionStore((s) => s.sounds);
  const setLastEndedBy = useSessionStore((s) => s.setLastEndedBy);
  const isCrisisOpen = useCrisisStore((s) => s.isOpen);

  // Lock the duration once at mount — a Setup change mid-session must not
  // retroactively shorten/lengthen the timers. useRef captures the live store
  // value at mount and never re-reads.
  const sessionTimingRef = useRef(
    deriveSessionTiming(useSessionStore.getState().durationMinutes),
  );
  const INTRO_MS         = sessionTimingRef.current.introMs;
  const TRIGGER_ZONE_MS  = sessionTimingRef.current.triggerZoneMs;
  const OUTRO_MS         = sessionTimingRef.current.outroMs;
  const TRIGGER_COUNT    = sessionTimingRef.current.triggerCount;
  const TRIGGER_INTERVAL_MS = sessionTimingRef.current.triggerIntervalMs;
  const TOTAL_SESSION_MS = sessionTimingRef.current.totalMs;

  // Keep the screen on for the duration of the session.
  useEffect(() => {
    void activateKeepAwakeAsync();
    return () => { deactivateKeepAwake(); };
  }, []);

  // ── Machine state ──────────────────────────────────────────────────────

  // /preparing now handles asset cache + buffer decode + audio activation
  // before routing here, so we skip LOADING and land directly on DISCLAIMER.
  // (LOADING is still in the state machine to support a future fallback path
  // where /session is reached without going through /preparing.)
  const [machineState, dispatch] = useReducer(sessionReducer, "DISCLAIMER");
  const machineStateRef = useRef<MachineState>("DISCLAIMER");
  useEffect(() => { machineStateRef.current = machineState; }, [machineState]);

  // ── UI state ───────────────────────────────────────────────────────────

  const [elapsed, setElapsed] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [watchBanner, setWatchBanner] = useState<"no-watch" | "disconnected" | null>(null);
  // Timestamp of the most recent burst's fade-out completion. Used to show
  // the "back to the moment" caption for POST_TRIGGER_CAPTION_MS afterwards.
  // Set from the engine's onBurstEnd callback in the TRIGGER_ZONE effect.
  const [lastBurstEndedAt, setLastBurstEndedAt] = useState<number | null>(null);
  // Timestamp of the most recent burst lead-in. Drives the pre-burst grounding
  // caption: from this moment until the burst actually starts (~TRIGGER_LEAD_IN_MS
  // later) the screen shows the calming/heads-up text instead of the "during" line.
  // Cleared on burst end so subsequent bursts get a fresh window.
  const [lastBurstApproachingAt, setLastBurstApproachingAt] = useState<number | null>(null);
  // v1.1.5: true while a Roy-recorded voice clip is audibly playing. We hide
  // the on-screen caption during voice playback because Roy's recordings are
  // not verbatim reads of the scripts in content.ts (natural phrasing
  // variation) — showing the script while the recording says different words
  // creates cognitive dissonance for the listener. The audio is canonical.
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  // Manual distress countdown (seconds remaining, null when not active).
  const [manualCountdown, setManualCountdown] = useState<number | null>(null);

  const startedAt = useRef(Date.now());
  const pausedSince = useRef<number | null>(null);
  const manualReturnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postTriggerDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCountdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  // Picked once at mount so LOADING (manifest) and DISCLAIMER (buffer load) use the same variation.
  const selectedAmbientTrack = useRef(getAmbientTrack(scene));

  // ── Audio engine ───────────────────────────────────────────────────────

  const engine = useAudioEngine();

  // ── Pulse monitor ──────────────────────────────────────────────────────

  const onSpike = useCallback(() => {
    if (machineStateRef.current !== "TRIGGER_ZONE") return;
    engine.onSpike();
  }, [engine]);

  const onNormalized = useCallback(() => {
    engine.onNormalized();
  }, [engine]);

  const onWatchDisconnected = useCallback(() => {
    setWatchBanner("disconnected");
  }, []);

  // v1.1.5: thin wrapper around engine.playVoiceClip that flips
  // isVoicePlaying around the audio so the on-screen caption can hide while
  // Roy's recording (which may differ slightly from the script) is audible.
  const playVoice = useCallback(
    (index: number): Promise<void> => {
      setIsVoicePlaying(true);
      return engine.playVoiceClip(index).finally(() => {
        setIsVoicePlaying(false);
      });
    },
    [engine],
  );

  const onWatchReconnected = useCallback(() => {
    setWatchBanner(null);
    // Clear manual countdown when watch reconnects.
    if (manualReturnTimer.current) clearTimeout(manualReturnTimer.current);
    if (manualCountdownInterval.current) clearInterval(manualCountdownInterval.current);
    setManualCountdown(null);
    // Resume trigger ramp — engine was stuck in spiked state from the manual distress press.
    engine.onNormalized();
  }, [engine]);

  const { pulseBpm, sessionBaseline, isSpiked, watchConnected, reportManualDistress } =
    usePulseMonitor({
      sessionState: machineState,
      isSessionActive: !isCrisisOpen,
      onSpike,
      onNormalized,
      onWatchDisconnected,
      onWatchReconnected,
    });

  // Show no-watch banner on first render if no watch connected.
  useEffect(() => {
    if (!watchConnected && machineState === "DISCLAIMER") {
      setWatchBanner("no-watch");
    }
  }, [watchConnected, machineState]);

  // ── INTRO: HR baseline collection → advance to TRIGGER_ZONE ───────────

  useEffect(() => {
    if (sessionBaseline !== null && machineState === "INTRO") {
      dispatch({ type: "INTRO_DONE" });
    }
  }, [sessionBaseline, machineState]);

  // Fallback: if INTRO elapses with no baseline (no watch), advance anyway.
  useEffect(() => {
    if (machineState !== "INTRO") return;
    const id = setTimeout(() => {
      if (machineStateRef.current === "INTRO") {
        dispatch({ type: "INTRO_DONE" });
      }
    }, INTRO_MS);
    return () => clearTimeout(id);
  }, [machineState]);

  // ── LOADING: verify/download assets ───────────────────────────────────

  useEffect(() => {
    if (machineState !== "LOADING") return;

    const ambientTrack = selectedAmbientTrack.current;
    const voiceClips = getVoiceClips(scene, i18n.language);

    // Only include CDN assets (skip placeholders — no network call possible).
    const manifest: AssetManifest = [
      ...(!isPlaceholderSource(ambientTrack.source) && typeof ambientTrack.source === "string"
        ? [{ key: ambientTrack.key, url: ambientTrack.source, sha256: ambientTrack.sha256 ?? "" }]
        : []),
      ...voiceClips
        .filter((c) => !isPlaceholderSource(c.source) && typeof c.source === "string")
        .map((c) => ({ key: c.key, url: c.source as string, sha256: c.sha256 ?? "" })),
    ];

    (async () => {
      try {
        if (manifest.length > 0) {
          await ensureAssets(manifest, (done, total) => {
            setLoadProgress(done / total);
          });
        }
        dispatch({ type: "ASSETS_READY" });
      } catch (e) {
        setLoadError("Failed to download audio files. Check your connection and try again.");
      }
    })();
  }, [machineState]);

  // ── DISCLAIMER: load ambient + voice buffers, start ambient, play clip 0 ──

  useEffect(() => {
    if (machineState !== "DISCLAIMER") return;

    const ambientTrack = selectedAmbientTrack.current;
    const voiceClips = getVoiceClips(scene, i18n.language);
    const disclaimerClip = voiceClips[0];

    if (isPlaceholderSource(ambientTrack.source) && isPlaceholderSource(disclaimerClip.source)) {
      // No real assets yet — skip loading, advance immediately.
      dispatch({ type: "DISCLAIMER_DONE" });
      return;
    }

    const voiceSources = voiceClips
      .filter((c) => !isPlaceholderSource(c.source))
      .map((c) => c.source as number | string);

    audioTrace("session DISCLAIMER: kicking off loadAmbientAndVoice");
    engine
      .loadAmbientAndVoice(
        isPlaceholderSource(ambientTrack.source) ? 0 : (ambientTrack.source as number | string),
        voiceSources
      )
      .then(async () => {
        // startAmbient only after buffer is loaded. Await it — it's now
        // async because we explicitly wait for ctx.resume() to flip
        // suspended→running on iOS.
        if (!isPlaceholderSource(ambientTrack.source)) {
          await engine.startAmbient();
        }
        if (!isPlaceholderSource(disclaimerClip.source)) {
          return playVoice(0);
        }
      })
      .then(() => dispatch({ type: "DISCLAIMER_DONE" }))
      .catch((e) => {
        audioWarn("session DISCLAIMER: chain FAILED, advancing anyway", e);
        dispatch({ type: "DISCLAIMER_DONE" });
      });
  }, [machineState, engine]);

  // ── TRIGGER_ZONE: play pre-trigger narration, load sounds, start scheduler ──
  //
  // IMPORTANT: the scheduler must NOT start until the narration finishes.
  // Starting them concurrently causes two problems:
  //   1. Burst fires while narration is audible (collision).
  //   2. The engine's voice-finish callback calls _scheduleNextBurst internally,
  //      which orphans the scheduler's own timer → double burst on first fire.
  // Fix: Promise.all([voicePromise, loadPromise]) so the scheduler only starts
  // after both are done. The zone-end timer and first-burst delay are both
  // adjusted to account for the time already spent on narration + load.

  useEffect(() => {
    if (machineState !== "TRIGGER_ZONE") return;

    const zoneStartedAt = Date.now();
    const voiceClips = getVoiceClips(scene, i18n.language);

    // Start voice narration and trigger loading concurrently — they don't
    // interfere with each other. The scheduler waits for both.
    const voicePromise: Promise<void> = isPlaceholderSource(voiceClips[1].source)
      ? Promise.resolve()
      : playVoice(1).catch((e) => {
          audioWarn("session TRIGGER_ZONE: playVoice(1) REJECTED", e);
        });

    if (consentedSounds.length === 0) {
      // Rehearsal walk — no triggers. Timer starts from zone entry.
      const id = setTimeout(() => {
        if (machineStateRef.current === "TRIGGER_ZONE") {
          dispatch({ type: "TRIGGER_ZONE_DONE" });
        }
      }, TRIGGER_ZONE_MS);
      return () => clearTimeout(id);
    }

    // Load ALL variations of EVERY selected trigger sound so the engine can
    // rotate between them across bursts.
    const allTriggerSources: number[] = [];
    for (const key of consentedSounds) {
      const variations = getSound(key).audioVariations as number[];
      allTriggerSources.push(...variations);
    }

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout>;

    const loadPromise = engine.loadTriggers(allTriggerSources);

    Promise.all([voicePromise, loadPromise])
      .then(() => {
        if (cancelled) return;

        // Both narration and loading are done. Compute how much zone time has
        // elapsed so the first burst and zone-end timer are positioned correctly.
        const elapsed = Date.now() - zoneStartedAt;
        const remainingZoneMs = Math.max(0, TRIGGER_ZONE_MS - elapsed);

        // First burst: target the midpoint of the first time slot from zone
        // start, but clamp to at least 2 s after narration to give a breath.
        const targetFirstBurst = TRIGGER_INTERVAL_MS / 2;
        const initialDelay = Math.max(2_000, targetFirstBurst - elapsed);

        engine.startTriggerScheduler({
          intervalMinMs: 0,
          intervalMaxMs: 0,
          fixedIntervalMs: TRIGGER_INTERVAL_MS,
          initialDelayMs: initialDelay,
          maxBursts: TRIGGER_COUNT,
          burstDurationMs: TRIGGER_BURST_DURATION_MS,
          fadeInMs: TRIGGER_FADE_IN_MS,
          fadeOutMs: TRIGGER_FADE_OUT_MS,
          peakGain: dBToGain(TRIGGER_PEAK_DB),
          leadInMs: TRIGGER_LEAD_IN_MS,
          onBurstApproaching: () => {
            setLastBurstApproachingAt(Date.now());
          },
          onBurstEnd: () => {
            if (postTriggerDelayRef.current) clearTimeout(postTriggerDelayRef.current);
            postTriggerDelayRef.current = setTimeout(() => {
              setLastBurstEndedAt(Date.now());
            }, 3000);
            setLastBurstApproachingAt(null);
          },
        });

        timerId = setTimeout(() => {
          if (machineStateRef.current === "TRIGGER_ZONE") {
            dispatch({ type: "TRIGGER_ZONE_DONE" });
          }
        }, remainingZoneMs);
      })
      .catch((e) => {
        audioWarn("session TRIGGER_ZONE: loadTriggers FAILED, falling back to rehearsal", e);
        if (!cancelled) {
          const elapsed = Date.now() - zoneStartedAt;
          timerId = setTimeout(() => {
            if (machineStateRef.current === "TRIGGER_ZONE") {
              dispatch({ type: "TRIGGER_ZONE_DONE" });
            }
          }, Math.max(0, TRIGGER_ZONE_MS - elapsed));
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      if (postTriggerDelayRef.current) clearTimeout(postTriggerDelayRef.current);
    };
  }, [machineState, consentedSounds, engine]);

  // ── OUTRO: stop triggers, play outro narration, then end session ──────

  useEffect(() => {
    if (machineState !== "OUTRO") return;

    // Ensure no further bursts — handles the edge case where a spike recovery
    // timer in the engine fires after we leave TRIGGER_ZONE.
    engine.stopTriggerScheduler();

    // Play outro narration immediately at zone entry.
    const voiceClips = getVoiceClips(scene, i18n.language);
    if (!isPlaceholderSource(voiceClips[2].source)) {
      playVoice(2).catch((e) => {
        audioWarn("session OUTRO: playVoice(2) REJECTED", e);
      });
    }

    const id = setTimeout(() => {
      if (machineStateRef.current === "OUTRO") {
        setLastEndedBy("natural");
        dispatch({ type: "SESSION_END" });
      }
    }, OUTRO_MS);

    return () => clearTimeout(id);
  }, [machineState, engine]);

  // ── WIND_DOWN → /winding-down transition screen (v1.1.0) ──────────────
  //
  // The wind-down narration + feedback handoff used to live on /session
  // itself. v1.1.0 routes to a dedicated /winding-down screen so the user
  // gets a clear transition moment between the active session UI and the
  // feedback form. /winding-down owns the fadeOutAll + voice clip + feedback
  // → /after; we replace, not push, so the user can't back-swipe into a
  // technically-ended session.

  useEffect(() => {
    if (machineState !== "WIND_DOWN") return;
    // Silence the active session before the wind-down screen takes over: stop
    // the in-flight voice (so a mantra doesn't talk over the wind-down clip)
    // and the trigger scheduler (so bursts/ambient don't bleed into the
    // transition + end screens). /winding-down fades the ambient out.
    engine.stopVoice();
    engine.stopTriggerScheduler();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace({ pathname: "/winding-down" as any, params: { scene } });
  }, [machineState, router, scene, engine]);

  // ── Suspend session audio when it isn't the active foreground ──────────
  //
  // Two independent reasons to suspend the audio graph: the crisis sheet is
  // open, or another screen (e.g. /calming from "I need a moment") is pushed
  // on top and /session is blurred. Audio must stay paused while EITHER holds
  // and resume only when BOTH clear — otherwise closing the crisis sheet while
  // /calming is still on top would resume ambient/triggers behind the calming
  // screen (and drag them into the session-end screen). A single pausedSince
  // ref also freezes the elapsed clock across the pause.
  const [isFocused, setIsFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );
  useEffect(() => {
    const shouldPause = isCrisisOpen || !isFocused;
    if (shouldPause) {
      if (pausedSince.current === null) {
        pausedSince.current = Date.now();
        void engine.pauseAll();
      }
    } else if (pausedSince.current !== null) {
      startedAt.current += Date.now() - pausedSince.current;
      pausedSince.current = null;
      void engine.resumeAll();
    }
  }, [isCrisisOpen, isFocused, engine]);

  // ── Elapsed timer ─────────────────────────────────────────────────────
  //
  // v1.1.0: the visible timer ticks from the moment the session screen
  // mounts (DISCLAIMER state included), so the user doesn't see it
  // jump from 0:00 → 0:24 the instant DISCLAIMER finishes. Excludes
  // WIND_DOWN / POST_SESSION — by then we're routing to the wind-down
  // transition screen anyway.

  useEffect(() => {
    const active =
      machineState === "DISCLAIMER" ||
      machineState === "INTRO" ||
      machineState === "TRIGGER_ZONE" ||
      machineState === "OUTRO";
    if (!active) return;

    const id = setInterval(() => {
      if (!isCrisisOpen) {
        setElapsed(Date.now() - startedAt.current);
      }
    }, 250);
    return () => clearInterval(id);
  }, [machineState, isCrisisOpen]);

  // ── Manual distress (no watch / watch disconnected) ───────────────────

  const handleManualDistress = useCallback(() => {
    // For chronic high-baseline users, also notify the pulse monitor.
    reportManualDistress();

    // Silence trigger and start 90-second countdown.
    engine.onSpike();

    if (manualReturnTimer.current) clearTimeout(manualReturnTimer.current);
    if (manualCountdownInterval.current) clearInterval(manualCountdownInterval.current);

    let remaining = MANUAL_RETURN_MS / 1000;
    setManualCountdown(remaining);

    manualCountdownInterval.current = setInterval(() => {
      remaining -= 1;
      setManualCountdown(remaining);
      if (remaining <= 0) {
        if (manualCountdownInterval.current) clearInterval(manualCountdownInterval.current);
        manualCountdownInterval.current = null;
      }
    }, 1000);

    manualReturnTimer.current = setTimeout(() => {
      setManualCountdown(null);
      engine.onNormalized();
    }, MANUAL_RETURN_MS);
  }, [engine, reportManualDistress]);

  // Re-press resets the countdown (handleManualDistress always clears + restarts).
  const handleDistressPress = handleManualDistress;

  // ── End-session confirm (v1.1.0) ───────────────────────────────────────
  //
  // Manual exit (close X, End-session pill) opens a custom-styled confirm
  // overlay (ExitSessionConfirm) that matches the rest of the app's design
  // language. On confirm: short fade-out then route straight to /after,
  // skipping the /winding-down narration + transition (the user explicitly
  // asked to leave early). Natural end (8-min timer) still goes through
  // /winding-down for the full closing voice.
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const handleEndSessionPress = useCallback(() => {
    setExitConfirmOpen(true);
  }, []);
  const handleExitCancel = useCallback(() => {
    setExitConfirmOpen(false);
  }, []);
  const handleExitConfirm = useCallback(() => {
    setExitConfirmOpen(false);
    engine.fadeOutAll(0.3);
    setLastEndedBy("manual-exit");
    router.replace("/after");
  }, [engine, router, setLastEndedBy]);

  // ── Derived display ───────────────────────────────────────────────────

  // Compute "are we in the post-trigger window" — drives the grounding
  // caption swap. Recomputed against `elapsed` so the 250ms timer that
  // already runs for the progress bar also drives this flip (no extra
  // setInterval needed).
  const isPostTrigger =
    lastBurstEndedAt !== null &&
    Date.now() - lastBurstEndedAt < POST_TRIGGER_CAPTION_MS;
  // v1.1.3 → v1.1.5: the lead-in window auto-expires after the maximum time
  // a burst's lifecycle could take — leadIn + burst + fade-out. Earlier we
  // relied on onBurstEnd to clear the flag, but when a mid-session voice clip
  // interrupts a burst (engine._interruptBurst clears scheduler timers but
  // never fires onBurstEnd), the flag got stuck and the "calming" caption
  // overlapped with the mid-session voice audio. Time-based expiry is the
  // simpler invariant: the window can't outlive the audio it's framing.
  const LEAD_IN_WINDOW_MS =
    TRIGGER_LEAD_IN_MS + TRIGGER_FADE_IN_MS + TRIGGER_BURST_DURATION_MS + TRIGGER_FADE_OUT_MS;
  const isApproachingTrigger =
    lastBurstApproachingAt !== null &&
    Date.now() - lastBurstApproachingAt < LEAD_IN_WINDOW_MS;

  const voiceText = useMemo(() => {
    if (machineState === "INTRO" || machineState === "LOADING" || machineState === "DISCLAIMER") {
      return getVoiceScript(scene, "opening", i18n.language);
    }
    if (machineState === "TRIGGER_ZONE") {
      // Show "calming" grounding script when HR spiked, ~4s before each burst
      // (lead-in window), or ~10s after each burst (post-trigger caption).
      // Otherwise show the normal in-session "during" line.
      if (isSpiked || isApproachingTrigger || isPostTrigger) {
        return getVoiceScript(scene, "calming", i18n.language);
      }
      return getVoiceScript(scene, "during", i18n.language);
    }
    return getVoiceScript(scene, "calming", i18n.language);
    // elapsed is intentionally in the dep list — it's the heartbeat that
    // re-evaluates `isPostTrigger` each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineState, scene, i18n.language, isSpiked, isApproachingTrigger, isPostTrigger, elapsed]);

  const slow = machineState === "WIND_DOWN" || machineState === "OUTRO" || isSpiked;
  const sceneLabel = localize(getScene(scene).label, i18n.language);

  // ── Pulse mock phase (drives mock generator arc) ──────────────────────
  // usePulseMonitor handles this internally, so we just display pulseBpm.

  // ── LOADING screen ────────────────────────────────────────────────────

  if (machineState === "LOADING") {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        {loadError ? (
          <>
            <Text style={{ color: tokens.text, fontFamily: fonts.body, fontSize: 16 }}>
              {loadError}
            </Text>
            <Pressable onPress={() => router.back()} style={{ marginTop: 24 }}>
              <Text style={{ color: tokens.accent, fontFamily: fonts.body, fontSize: 16 }}>
                {t("session.goBack")}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: tokens.text, fontFamily: fonts.body, fontSize: 14, opacity: 0.6 }}>
            {t("session.preparing")}
            {loadProgress > 0 ? ` ${Math.round(loadProgress * 100)}%` : ""}
          </Text>
        )}
      </View>
    );
  }

  // ── Main session screen ───────────────────────────────────────────────

  return (
    <View className="flex-1 bg-bg">
      {/* Lock the iOS back-swipe + Android back-gesture while mid-session.
          The only ways out are the close X, the End-session pill, or the
          natural session-end timer. Prevents an accidental swipe-back from
          dumping the user into /preparing mid-flow. */}
      <Stack.Screen options={{ gestureEnabled: false }} />

      <SceneBackground scene={scene} intensity={slow ? 0.86 : 0.78} />
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-7">

          {/* Header — nav element (close) on the leading edge so it reads
              correctly across both reading directions: LEFT in LTR English,
              RIGHT in RTL Hebrew (auto-flipped via I18nManager). */}
          <View className="flex-row justify-between items-center pt-2">
            <Pressable hitSlop={16} onPress={handleEndSessionPress}>
              <Icon name="close" size={20} color={tokens.sceneText} />
            </Pressable>
            <CrisisAffordance tone="on-scene" />
          </View>

          {/* Watch status banner */}
          {watchBanner !== null && (
            <View style={{ marginTop: 8, padding: 8, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 8 }}>
              <Text style={{ color: tokens.sceneText, fontFamily: fonts.body, fontSize: 12 }}>
                {watchBanner === "no-watch"
                  ? t("session.noWatch")
                  : t("session.watchDisconnected")}
              </Text>
            </View>
          )}

          {/* Scene label */}
          <View className="pt-8">
            <Text
              style={{
                color: tokens.sceneText,
                fontFamily: fonts.body,
                fontSize: 13,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                opacity: 0.65,
                textAlign: "left",
              }}
            >
              {sceneLabel}
            </Text>
          </View>

          {/* Voice caption. Hidden while a voice clip is audibly playing —
              Roy's recordings aren't verbatim reads of the script and showing
              the script during playback creates a read/listen mismatch. */}
          <View className="pt-16">
            {/* voiceText is "" for scenes without recorded narration (v1.2.0
                newer scenes) — hide the caption entirely rather than render a
                blank line so those sessions read as intentionally quiet. */}
            {!isVoicePlaying && voiceText ? <VoiceLine text={voiceText} /> : null}
          </View>

          {/* Breathing circle */}
          <View className="flex-1 justify-center">
            <BreathingCircle
              flash={machineState === "TRIGGER_ZONE" && !isSpiked ? 0 : 0}
              slow={slow}
              paused={isCrisisOpen}
            />
          </View>

          {/* Manual distress / countdown (visible when no HR source) */}
          {(watchBanner !== null || !watchConnected) && machineState === "TRIGGER_ZONE" && (
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              {manualCountdown !== null && (
                <Text style={{ color: tokens.sceneText, fontFamily: fonts.body, fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                  {t("session.triggerReturnsIn", { seconds: manualCountdown })}
                </Text>
              )}
              <Pressable
                hitSlop={12}
                onPress={handleDistressPress}
                style={{ padding: 8, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.35)" }}
              >
                <Text style={{ color: tokens.sceneText, fontFamily: fonts.body, fontSize: 14 }}>
                  {t("session.lowerSound")}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Session progress — horizontal bar across the bottom, fills
              left-to-right as session elapses. Track and fill are SIBLINGS
              with their own opacities so the fill renders at full opacity
              over a faded track. Previous version nested fill inside track,
              which multiplied the opacities and made the fill invisible. */}
          <View className="pt-6" style={{ position: "relative", height: 4 }}>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                backgroundColor: tokens.sceneText,
                opacity: 0.25,
                borderRadius: 2,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${Math.min(100, (elapsed / TOTAL_SESSION_MS) * 100)}%`,
                height: 4,
                backgroundColor: tokens.sceneText,
                opacity: 0.85,
                borderRadius: 2,
              }}
            />
          </View>
          <Text
            style={{
              color: tokens.sceneText,
              fontFamily: fonts.body,
              fontSize: 12,
              opacity: 0.65,
              marginTop: 6,
            }}
          >
            {formatElapsed(elapsed)}
          </Text>

          {/* "I need a moment" — calming-protocol entry, always visible
              during a session. Per UI QA pass 2: shown throughout, not
              just after the trigger has played. The original gating was
              based on an exposure-first clinical claim; the product
              direction now prioritizes user control + visible escape
              hatch from the start. LOADING/DISCLAIMER already return
              their own screens earlier so we don't render here in those. */}
          <View style={{ alignItems: "center", paddingBottom: 4 }}>
            <Pressable
              hitSlop={12}
              onPress={() => {
                // v1.1.0: pause-and-return instead of teardown-and-route.
                // Cut any in-flight voice clip immediately (otherwise the
                // narration keeps speaking mid-sentence under the calming
                // protocol), then PUSH /calming so /session stays mounted
                // underneath. The blur effect below suspends the audio
                // graph; on return, focus resumes it at the same point.
                engine.stopVoice();
                router.push("/calming");
              }}
            >
              <Text style={{ color: tokens.sceneText, fontFamily: fonts.body, fontSize: 14, opacity: 0.75 }}>
                {t("home.needAMoment")}
              </Text>
            </Pressable>
          </View>

          {/* Bottom row — pulse metric removed per UI QA. Pulse is still
              read internally to drive auto-attenuate behavior, but no
              longer displayed to the user. */}
          {/* End session — was a barely-visible bracketed text. Now a
              bordered pill on sceneText color so it reads cleanly on
              both light and dark scene overlays. */}
          <View className="flex-row justify-end items-center pt-4 pb-6">
            <Pressable
              hitSlop={12}
              onPress={handleEndSessionPress}
              style={{
                borderWidth: 1,
                borderColor: tokens.sceneText,
                borderRadius: 999,
                paddingHorizontal: 18,
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  color: tokens.sceneText,
                  fontFamily: fonts.body,
                  fontSize: 15,
                }}
              >
                {t("session.end")}
              </Text>
            </Pressable>
          </View>

        </View>
      </SafeAreaView>

      <ExitSessionConfirm
        isOpen={exitConfirmOpen}
        onCancel={handleExitCancel}
        onConfirm={handleExitConfirm}
      />
    </View>
  );
}
