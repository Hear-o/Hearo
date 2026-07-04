import { useEffect, useRef, useState } from "react";

import * as healthKit from "./healthKit";

export type PulsePhase = "baseline" | "rising" | "peak" | "settling";

type Options = {
  active: boolean;
  phase: PulsePhase;
};

export type PulseSource = "real" | "mock";

export type PulseResult = {
  value: number;
  source: PulseSource;
};

// Mock-pulse targets per phase — used when the device has no real HR source
// (web, Android, no paired watch, or permission denied).
const TARGETS: Record<PulsePhase, number> = {
  baseline: 74,
  rising: 96,
  peak: 112,
  settling: 82,
};

const STEP = 1.4;
const JITTER = 1.6;
const MOCK_TICK_MS = 220;
const REAL_SILENCE_MS = 10_000; // per spec: 10s without a sample → fall back

export function usePulse({ active, phase }: Options): PulseResult {
  const [value, setValue] = useState<number>(TARGETS.baseline);
  const [source, setSource] = useState<PulseSource>("mock");

  // Tracks the timestamp of the last real sample we received. The mock-tick
  // checks this to decide whether to "take over" (silent fallback).
  const lastRealSampleAt = useRef<number | null>(null);

  // Try to attach to HealthKit on mount. If it's available, we run *both*
  // streams: real samples drive `value` directly, and the mock loop sits idle
  // unless real has been silent for REAL_SILENCE_MS.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    void (async () => {
      const available = await healthKit.isAvailable();
      if (cancelled || !available) return;
      setSource("real");
      lastRealSampleAt.current = Date.now();
      unsubscribe = healthKit.subscribeHeartRate(({ bpm }) => {
        lastRealSampleAt.current = Date.now();
        setValue(bpm);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [active]);

  // Mock loop: always runs while active. When `source === "real"` and we've
  // had a sample recently, it does nothing. Otherwise it advances `value`
  // toward the phase-keyed target so demos still feel alive.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const now = Date.now();
      const last = lastRealSampleAt.current;
      const realIsLive =
        source === "real" && last !== null && now - last < REAL_SILENCE_MS;
      if (realIsLive) return;

      // If real was live and just went quiet, downgrade source so the UI
      // (and the auto-soften logic) can read it.
      if (source === "real" && (last === null || now - last >= REAL_SILENCE_MS)) {
        setSource("mock");
      }

      setValue((current) => {
        const target = TARGETS[phase];
        const delta = target - current;
        const direction = Math.sign(delta);
        const moved = Math.abs(delta) < STEP ? delta : direction * STEP;
        const next = current + moved + (Math.random() - 0.5) * JITTER;
        return Math.max(58, Math.min(130, next));
      });
    }, MOCK_TICK_MS);
    return () => clearInterval(id);
  }, [active, phase, source]);

  return { value: Math.round(value), source };
}
