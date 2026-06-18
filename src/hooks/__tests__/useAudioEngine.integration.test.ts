// Integration test for useAudioEngine ↔ the REAL AudioEngine ↔ explicit
// audio-session activation.
//
// The sibling unit suite (useAudioEngine.test.ts) mocks AudioEngine wholesale,
// so it only proves the hook forwards arguments. It can't catch a wiring break
// between the hook, the actual audio graph, and the iOS session gate — exactly
// the failure mode the QE skill warns about ("passes unit tests individually,
// zero integration wiring").
//
// Here we deliberately DO NOT mock @/lib/audio/audio-engine. The hook builds a
// genuine AudioEngine; that engine builds an AudioContext from the in-house
// react-native-audio-api mock wired up in test/setup.ts. We then reach into the
// mock's __lastContext() to assert on the real nodes the engine created, and
// drive the HR-spike path end-to-end through the hook surface the way
// session.tsx does on iOS (HealthKit pulse → onSpike → trigger fade).

import { renderHook, act } from "@testing-library/react-native";

import * as audioApi from "../../../test/mocks/react-native-audio-api";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { releaseAudioEngine } from "@/lib/audio/audio-engine-host";

const SILENCE_GAIN = 0.001;

// Small, fast scheduler config so fake-timer math stays trivial (mirrors the
// engine unit suite's CFG).
const CFG = {
  intervalMinMs: 1000,
  intervalMaxMs: 2000,
  burstDurationMs: 500,
  fadeInMs: 100,
  fadeOutMs: 100,
  peakGain: 0.5,
};

const ctx = () => audioApi.__lastContext();

/** Mount the hook and load every buffer, awaiting the audio-session gate
 *  the same way the DISCLAIMER/ADAPTIVE_LOOP effects in session.tsx do. */
async function mountLoaded() {
  const view = renderHook(() => useAudioEngine());
  await act(async () => {
    await view.result.current.loadAmbientAndVoice(1, [2, 3]); // ambient + 2 voice
    await view.result.current.loadTrigger(4);
  });
  return view;
}

beforeEach(() => {
  releaseAudioEngine();
  jest.clearAllMocks();
  audioApi.__reset();
});

afterEach(() => {
  releaseAudioEngine();
});

describe("useAudioEngine / real engine wiring", () => {
  it("constructs a real AudioEngine and wires the three-layer graph on mount", () => {
    renderHook(() => useAudioEngine());
    const c = ctx();

    // Hook → engine ctor → audio graph: three gains, all connected to the
    // destination, trigger starting silenced.
    expect(c.createGain).toHaveBeenCalledTimes(3);
    expect(c.gains).toHaveLength(3);
    c.gains.forEach((g) => expect(g.connect).toHaveBeenCalledWith(c.destination));
  });

  it("exposes the live trigger gain from the real engine through the hook getter", () => {
    const { result } = renderHook(() => useAudioEngine());
    // currentTriggerGain() reads the actual engine node, not a stubbed value.
    expect(result.current.currentTriggerGain()).toBeCloseTo(SILENCE_GAIN);
    expect(result.current.isBurstActive()).toBe(false);
  });

  it("activates the audio session before decoding on the real context", async () => {
    const { result } = await mountLoaded();
    expect(audioApi.AudioManager.setAudioSessionActivity).toHaveBeenCalledWith(true);
    expect(ctx().decodeAudioData).toHaveBeenCalledTimes(4);
    expect(result.current).toBeDefined();
  });

  it("startAmbient drives the real engine to start one looping source", async () => {
    const { result } = await mountLoaded();
    await act(async () => {
      await result.current.startAmbient();
    });

    const c = ctx();
    expect(c.createBufferSource).toHaveBeenCalledTimes(1);
    const src = c.sources[0];
    expect(src.loop).toBe(true);
    expect(src.start).toHaveBeenCalledWith(0);
  });

  it("keeps the shared context across unmounts until explicitly released", async () => {
    const { unmount } = await mountLoaded();
    const c = ctx();
    unmount();

    expect(c.close).not.toHaveBeenCalled();
    releaseAudioEngine();
    expect(c.close).toHaveBeenCalledTimes(1);
  });
});

describe("useAudioEngine / HR-spike loop (iOS pulse → audio)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Math.random=0 → randomBetween() returns the interval minimum, so the
    // first burst fires deterministically at intervalMinMs.
    jest.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("ramps the trigger to peak gain once a scheduled burst fires", async () => {
    const { result } = await mountLoaded();
    act(() => result.current.startTriggerScheduler(CFG));
    expect(result.current.isBurstActive()).toBe(false);

    act(() => {
      jest.advanceTimersByTime(CFG.intervalMinMs);
    });

    // Observability getters read the live engine state, and the burst ramped
    // the real trigger gain node to peak.
    expect(result.current.isBurstActive()).toBe(true);
    expect(result.current.currentTriggerGain()).toBeCloseTo(CFG.peakGain);
  });

  it("onSpike fades out and stops an active burst end-to-end", async () => {
    const { result } = await mountLoaded();
    act(() => result.current.startTriggerScheduler(CFG));
    act(() => {
      jest.advanceTimersByTime(CFG.intervalMinMs);
    });
    expect(result.current.isBurstActive()).toBe(true);

    // This is the path session.tsx takes when usePulseMonitor confirms an HR
    // spike from the HealthKit feed on iOS: engine.onSpike() pauses the
    // scheduler and fades the active burst, which hard-stops after ~2.6s.
    act(() => result.current.onSpike());
    act(() => {
      jest.advanceTimersByTime(2600);
    });

    expect(result.current.isBurstActive()).toBe(false);
  });

  it("resumes scheduling after onNormalized once the grace period elapses", async () => {
    const { result } = await mountLoaded();
    act(() => result.current.startTriggerScheduler(CFG));
    act(() => {
      jest.advanceTimersByTime(CFG.intervalMinMs);
    });
    act(() => result.current.onSpike());
    act(() => {
      jest.advanceTimersByTime(2600);
    });

    act(() => result.current.onNormalized());
    act(() => {
      jest.advanceTimersByTime(30_000); // grace window
      jest.advanceTimersByTime(CFG.intervalMinMs); // next burst fires
    });

    expect(result.current.isBurstActive()).toBe(true);
  });
});
