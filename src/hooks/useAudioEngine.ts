import { useEffect, useRef, useCallback } from 'react';
import { AudioEngine, TriggerSchedulerConfig } from '@/lib/audio/audio-engine';
import { audioSessionReady } from '@/lib/audio/audio-session';

export type { TriggerSchedulerConfig };

export interface UseAudioEngineResult {
  // ── Loading ──
  loadAmbientAndVoice: (
    ambientSource: number | string,
    voiceClipSources: (number | string)[]
  ) => Promise<void>;
  loadTrigger: (triggerSource: number | string) => Promise<void>;

  // ── Ambient ──
  startAmbient: () => void;
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

  // ── Session lifecycle ──
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  fadeOutAll: (durationSeconds?: number) => void;

  // ── Observability ──
  currentTriggerGain: () => number;
  isBurstActive: () => boolean;
}

export function useAudioEngine(): UseAudioEngineResult {
  const engineRef = useRef<AudioEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new AudioEngine();
  }

  useEffect(() => {
    const engine = engineRef.current!;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Gate the first I/O against the iOS audio-session activation. The
  // AudioContext is constructed in the engine ctor (cheap, doesn't play
  // anything yet), but actually starting playback before AVAudioSession
  // setActive resolves leads to silent audio on TestFlight. Both load
  // entry points are always called before startAmbient / playVoiceClip
  // / scheduler ticks, so awaiting here covers every playback path.
  const loadAmbientAndVoice = useCallback(
    async (ambientSource: number | string, voiceClipSources: (number | string)[]) => {
      await audioSessionReady;
      return engineRef.current!.loadAmbientAndVoice(ambientSource, voiceClipSources);
    },
    []
  );

  const loadTrigger = useCallback(
    async (triggerSource: number | string) => {
      await audioSessionReady;
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

  const pauseAll = useCallback(() => engineRef.current!.pauseAll(), []);

  const resumeAll = useCallback(() => engineRef.current!.resumeAll(), []);

  const fadeOutAll = useCallback(
    (durationSeconds?: number) => engineRef.current!.fadeOutAll(durationSeconds),
    []
  );

  const currentTriggerGain = useCallback(
    () => engineRef.current?.currentTriggerGain ?? 0,
    []
  );

  const isBurstActive = useCallback(
    () => engineRef.current?.isBurstActive ?? false,
    []
  );

  return {
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
    pauseAll,
    resumeAll,
    fadeOutAll,
    currentTriggerGain,
    isBurstActive,
  };
}
