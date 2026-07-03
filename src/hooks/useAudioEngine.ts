import { useEffect, useMemo, useRef, useCallback } from 'react';
import { AudioEngine, TriggerRampOptions } from '@/lib/audio-engine';

export interface UseAudioEngineResult {
  loadAmbientAndVoice: (
    ambientSource: number | string,
    voiceClipSources: (number | string)[]
  ) => Promise<void>;
  loadTrigger: (triggerSource: number | string) => Promise<void>;
  startAmbient: () => void;
  startTriggerRamp: (opts: TriggerRampOptions) => void;
  onSpike: () => void;
  onNormalized: () => void;
  playVoiceClip: (index: number) => Promise<void>;
  setTriggerCeiling: (gain: number) => void;
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  fadeOutAll: (durationSeconds?: number) => void;
  currentTriggerGain: () => number;
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

  const loadAmbientAndVoice = useCallback(
    (ambientSource: number | string, voiceClipSources: (number | string)[]) =>
      engineRef.current!.loadAmbientAndVoice(ambientSource, voiceClipSources),
    []
  );

  const loadTrigger = useCallback(
    (triggerSource: number | string) =>
      engineRef.current!.loadTrigger(triggerSource),
    []
  );

  const startAmbient = useCallback(() => engineRef.current!.startAmbient(), []);

  const startTriggerRamp = useCallback(
    (opts: TriggerRampOptions) => engineRef.current!.startTriggerRamp(opts),
    []
  );

  const onSpike = useCallback(() => engineRef.current!.onSpike(), []);

  const onNormalized = useCallback(() => engineRef.current!.onNormalized(), []);

  const playVoiceClip = useCallback(
    (index: number) => engineRef.current!.playVoiceClip(index),
    []
  );

  const setTriggerCeiling = useCallback(
    (gain: number) => engineRef.current!.setTriggerCeiling(gain),
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

  // Every callback above is stable for the component's lifetime (useCallback
  // with empty deps), so this object is created once and never changes
  // reference. Without useMemo, effects in session.tsx that depend on this
  // hook's return value (e.g. the ADAPTIVE_LOOP auto-end timer) would tear
  // down and re-run on every parent re-render.
  return useMemo(
    () => ({
      loadAmbientAndVoice,
      loadTrigger,
      startAmbient,
      startTriggerRamp,
      onSpike,
      onNormalized,
      playVoiceClip,
      setTriggerCeiling,
      pauseAll,
      resumeAll,
      fadeOutAll,
      currentTriggerGain,
    }),
    [
      loadAmbientAndVoice,
      loadTrigger,
      startAmbient,
      startTriggerRamp,
      onSpike,
      onNormalized,
      playVoiceClip,
      setTriggerCeiling,
      pauseAll,
      resumeAll,
      fadeOutAll,
      currentTriggerGain,
    ]
  );
}
