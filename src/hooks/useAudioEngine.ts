import { useMemo, useRef, useCallback } from 'react';
import { AudioEngine, TriggerSchedulerConfig } from '@/lib/audio/audio-engine';
import { getAudioEngine } from '@/lib/audio/audio-engine-host';
import { audioTrace } from '@/lib/audio/audio-log';
import { activateAudioSession } from '@/lib/audio/audio-session';

export type { TriggerSchedulerConfig };

export interface UseAudioEngineResult {
  // ── Loading ──
  loadAmbientAndVoice: (
    ambientSource: number | string,
    voiceClipSources: (number | string)[]
  ) => Promise<void>;
  loadTrigger: (triggerSource: number | string) => Promise<void>;

  // ── Ambient ──
  startAmbient: () => Promise<void>;
  setAmbientGain: (gain: number) => void;

  // ── Trigger scheduler ──
  startTriggerScheduler: (config: TriggerSchedulerConfig) => void;
  stopTriggerScheduler: () => void;

  // ── Live config updates ──
  setTriggerPeakGain: (gain: number) => void;
  setIntervalRange: (minMs: number, maxMs: number) => void;
  setBurstDuration: (ms: number) => void;

  // ── HR spike integration ──
  onSpike: () => void;
  onNormalized: () => void;

  // ── Voice ──
  playVoiceClip: (index: number) => Promise<void>;
  stopVoice: () => void;

  // ── Session lifecycle ──
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  fadeOutAll: (durationSeconds?: number) => void;

  // ── Observability ──
  currentTriggerGain: () => number;
  isBurstActive: () => boolean;
}

export function useAudioEngine(): UseAudioEngineResult {
  // The engine is now a module-level singleton (audio-engine-host) so the
  // /preparing screen and /session can share one instance — preloaded buffers
  // survive the route transition. Destruction is explicit (releaseAudioEngine)
  // and lives in /after's mount effect.
  const engineRef = useRef<AudioEngine>(getAudioEngine());

  // Gate the first I/O against the audio-session activation. The
  // AudioContext is constructed in the engine ctor (cheap, doesn't play
  // anything yet), but on iOS, starting playback before AVAudioSession
  // setActive resolves leads to silent audio. On Android the call is a
  // no-op so this just resolves immediately. Both load entry points are
  // always called before startAmbient / playVoiceClip / scheduler ticks,
  // so awaiting here covers every playback path.
  const loadAmbientAndVoice = useCallback(
    async (ambientSource: number | string, voiceClipSources: (number | string)[]) => {
      // Activate the iOS audio session right before the first I/O. This is
      // load-bearing for iOS — the module-init activation can fail and the
      // same call succeeds once the user has navigated into a session.
      // Idempotent: subsequent calls are cheap. See audio-session.ts.
      audioTrace("hook: activating audio session before loadAmbientAndVoice");
      await activateAudioSession();
      audioTrace("hook: calling loadAmbientAndVoice", {
        ambientSource: typeof ambientSource,
        voiceCount: voiceClipSources.length,
      });
      return engineRef.current!.loadAmbientAndVoice(ambientSource, voiceClipSources);
    },
    []
  );

  const loadTrigger = useCallback(
    async (triggerSource: number | string) => {
      audioTrace("hook: activating audio session before loadTrigger");
      await activateAudioSession();
      audioTrace("hook: calling loadTrigger");
      return engineRef.current!.loadTrigger(triggerSource);
    },
    []
  );

  const startAmbient = useCallback(() => engineRef.current!.startAmbient(), []);

  const setAmbientGain = useCallback(
    (gain: number) => engineRef.current!.setAmbientGain(gain),
    []
  );

  const startTriggerScheduler = useCallback(
    (config: TriggerSchedulerConfig) => engineRef.current!.startTriggerScheduler(config),
    []
  );

  const stopTriggerScheduler = useCallback(
    () => engineRef.current!.stopTriggerScheduler(),
    []
  );

  const setTriggerPeakGain = useCallback(
    (gain: number) => engineRef.current!.setTriggerPeakGain(gain),
    []
  );

  const setIntervalRange = useCallback(
    (minMs: number, maxMs: number) => engineRef.current!.setIntervalRange(minMs, maxMs),
    []
  );

  const setBurstDuration = useCallback(
    (ms: number) => engineRef.current!.setBurstDuration(ms),
    []
  );

  const onSpike = useCallback(() => engineRef.current!.onSpike(), []);

  const onNormalized = useCallback(() => engineRef.current!.onNormalized(), []);

  const playVoiceClip = useCallback(
    (index: number) => engineRef.current!.playVoiceClip(index),
    []
  );

  const stopVoice = useCallback(() => engineRef.current!.stopVoice(), []);

  const pauseAll = useCallback(() => engineRef.current!.pauseAll(), []);

  const resumeAll = useCallback(() => engineRef.current!.resumeAll(), []);

  const fadeOutAll = useCallback(
    (durationSeconds?: number) => engineRef.current!.fadeOutAll(durationSeconds),
    []
  );

  const currentTriggerGain = useCallback(
    () => engineRef.current.currentTriggerGain,
    []
  );

  const isBurstActive = useCallback(
    () => engineRef.current.isBurstActive,
    []
  );

  // LOAD-BEARING: every callback above is useCallback([]) → stable identity
  // across renders. The previous code returned a fresh object literal each
  // render, which broke session.tsx's useEffect dep arrays — every render of
  // Session would refire DISCLAIMER load + startTriggerScheduler + voice
  // playback effects (4× per second via the elapsed timer). The empty deps
  // array is correct: nothing in this object ever changes after first render.
  // (PR #59 originally used a 17-element explicit dep list; this is the
  // simpler equivalent — same effect, less to maintain.)
  return useMemo(
    () => ({
      loadAmbientAndVoice,
      loadTrigger,
      startAmbient,
      setAmbientGain,
      startTriggerScheduler,
      stopTriggerScheduler,
      setTriggerPeakGain,
      setIntervalRange,
      setBurstDuration,
      onSpike,
      onNormalized,
      playVoiceClip,
      stopVoice,
      pauseAll,
      resumeAll,
      fadeOutAll,
      currentTriggerGain,
      isBurstActive,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}
