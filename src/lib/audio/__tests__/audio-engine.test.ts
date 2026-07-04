jest.mock("react-native-audio-api", () =>
  require("../../../../test/mocks/react-native-audio-api"),
);

import * as audioApi from "../../../../test/mocks/react-native-audio-api";
import { AudioEngine, dBToGain } from "@/lib/audio/audio-engine";

const SILENCE_GAIN = 0.001;

// Small, fast scheduler config so timer math is easy to reason about.
const CFG = {
  intervalMinMs: 1000,
  intervalMaxMs: 2000,
  burstDurationMs: 500,
  fadeInMs: 100,
  fadeOutMs: 100,
  peakGain: 0.5,
};

async function loadedEngine(): Promise<AudioEngine> {
  const engine = new AudioEngine();
  await engine.loadAmbientAndVoice(1, [2, 3]); // ambient + 2 voice clips
  await engine.loadTrigger(4);
  return engine;
}

const ctx = () => audioApi.__lastContext();

beforeEach(() => {
  jest.useFakeTimers();
  // Math.random=0 → randomBetween() returns the interval minimum (deterministic).
  jest.spyOn(Math, "random").mockReturnValue(0);
  audioApi.__reset();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("dBToGain", () => {
  it("maps 0 dB to unity and -20 dB to 0.1", () => {
    expect(dBToGain(0)).toBe(1);
    expect(dBToGain(-20)).toBeCloseTo(0.1);
  });
});

describe("AudioEngine / construction + loading", () => {
  it("wires three gain nodes to the destination with the trigger silenced", () => {
    const engine = new AudioEngine();
    const c = ctx();
    expect(c.createGain).toHaveBeenCalledTimes(3);
    expect(c.gains).toHaveLength(3);
    c.gains.forEach((g) => expect(g.connect).toHaveBeenCalledWith(c.destination));
    expect(engine.currentTriggerGain).toBeCloseTo(SILENCE_GAIN);
    expect(engine.isBurstActive).toBe(false);
  });

  it("startAmbient rejects before the ambient buffer is loaded", async () => {
    // Inline try/catch rather than `await expect(...).rejects.toThrow(...)` —
    // the latter, combined with the async startAmbient + fake timers from
    // this file's beforeEach, produced a jest-mock stack-overflow only under
    // the full-suite parallel runner. Plain try/catch sidesteps that
    // bookkeeping path.
    const engine = new AudioEngine();
    let caught: unknown;
    try {
      await engine.startAmbient();
    } catch (e) {
      caught = e;
    }
    expect((caught as Error | undefined)?.message).toMatch(
      /ambient buffer not loaded/,
    );
  });

  it("startAmbient loops the buffer once and is idempotent", async () => {
    const engine = await loadedEngine();
    await engine.startAmbient();
    const c = ctx();
    expect(c.createBufferSource).toHaveBeenCalledTimes(1);
    const src = c.sources[0];
    expect(src.loop).toBe(true);
    expect(src.start).toHaveBeenCalledWith(0);

    await engine.startAmbient(); // already started → no new source
    expect(c.createBufferSource).toHaveBeenCalledTimes(1);
  });

  it("startTriggerScheduler throws before the trigger buffer is loaded", async () => {
    const engine = new AudioEngine();
    await engine.loadAmbientAndVoice(1, []);
    let err: unknown;
    try {
      engine.startTriggerScheduler(CFG);
    } catch (e) {
      err = e;
    }
    expect((err as Error)?.message).toMatch(/trigger buffer not loaded/);
  });

  // v1.1.0 idempotency guard — re-calling loadTriggers with the same source
  // list is a no-op (skips the decodeAudioData round trip). Covers the
  // "same set already loaded" early-return branch.
  it("loadTriggers is a no-op when called again with the same sources", async () => {
    const engine = await loadedEngine();
    const c = ctx();
    const before = c.decodeAudioData.mock.calls.length;
    await engine.loadTriggers([4]); // same source as loadedEngine's initial load
    const after = c.decodeAudioData.mock.calls.length;
    expect(after).toBe(before); // no extra decode calls
  });
});

describe("AudioEngine / burst scheduler", () => {
  it("fires a burst, fades it out, and reschedules", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG);
    expect(engine.isBurstActive).toBe(false);

    jest.advanceTimersByTime(CFG.intervalMinMs); // first burst fires
    expect(engine.isBurstActive).toBe(true);

    jest.advanceTimersByTime(CFG.fadeInMs + CFG.burstDurationMs); // burst ends (fade-out)
    jest.advanceTimersByTime(CFG.fadeOutMs + 50); // cleanup → stop + reschedule
    expect(engine.isBurstActive).toBe(false);

    jest.advanceTimersByTime(CFG.intervalMinMs); // next burst fires
    expect(engine.isBurstActive).toBe(true);
  });

  it("stopTriggerScheduler halts an active burst and clears timers", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG);
    jest.advanceTimersByTime(CFG.intervalMinMs);
    expect(engine.isBurstActive).toBe(true);

    engine.stopTriggerScheduler();
    expect(engine.isBurstActive).toBe(false);
    // No further bursts after stopping.
    jest.advanceTimersByTime(CFG.intervalMaxMs * 2);
    expect(engine.isBurstActive).toBe(false);
  });

  it("swallows a throw from a burst source's stop()", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG);
    jest.advanceTimersByTime(CFG.intervalMinMs);
    const burstSrc = ctx().sources[ctx().sources.length - 1];
    burstSrc.stop.mockImplementation(() => {
      throw new Error("already stopped");
    });
    expect(() => engine.stopTriggerScheduler()).not.toThrow();
  });

  // v1.1.3: pre-burst heads-up callback.
  it("fires onBurstApproaching leadInMs before each burst", async () => {
    const engine = await loadedEngine();
    const onBurstApproaching = jest.fn();
    engine.startTriggerScheduler({ ...CFG, leadInMs: 400, onBurstApproaching });

    // Lead-in should fire at (intervalMinMs - leadInMs) = 600ms in.
    jest.advanceTimersByTime(600);
    expect(onBurstApproaching).toHaveBeenCalledTimes(1);
    expect(engine.isBurstActive).toBe(false);

    // Burst still fires at the original delay (400ms later).
    jest.advanceTimersByTime(400);
    expect(engine.isBurstActive).toBe(true);
  });

  it("fires onBurstApproaching immediately when interval is shorter than leadInMs", async () => {
    const engine = await loadedEngine();
    const onBurstApproaching = jest.fn();
    // leadInMs > intervalMinMs → clamped to delay-0, fires at t=0.
    engine.startTriggerScheduler({ ...CFG, leadInMs: 5000, onBurstApproaching });

    jest.advanceTimersByTime(0);
    expect(onBurstApproaching).toHaveBeenCalledTimes(1);
  });

  it("does not fire onBurstApproaching when leadInMs is 0 or omitted", async () => {
    const engine = await loadedEngine();
    const onBurstApproaching = jest.fn();
    engine.startTriggerScheduler({ ...CFG, leadInMs: 0, onBurstApproaching });
    jest.advanceTimersByTime(CFG.intervalMinMs + 50);
    expect(onBurstApproaching).not.toHaveBeenCalled();
  });

  it("clears the lead-in timer on stopTriggerScheduler", async () => {
    const engine = await loadedEngine();
    const onBurstApproaching = jest.fn();
    engine.startTriggerScheduler({ ...CFG, leadInMs: 400, onBurstApproaching });
    engine.stopTriggerScheduler();
    jest.advanceTimersByTime(2_000);
    expect(onBurstApproaching).not.toHaveBeenCalled();
  });
});

// v1.1.3: ambient duck during burst — keeps the scene audibly present
// underneath each practice-moment instead of being drowned by it.
describe("AudioEngine / ambient duck during burst", () => {
  it("ducks ambient on burst start and restores on burst end", async () => {
    const engine = await loadedEngine();
    const ambientGain = ctx().gains[0];
    // Lock pre-duck level (default is 1.0 from ctor — but explicit setAmbientGain
    // gives us a ramp call we can inspect cleanly).
    engine.setAmbientGain(1.0);
    ambientGain.gain.linearRampToValueAtTime.mockClear();

    engine.startTriggerScheduler(CFG);
    jest.advanceTimersByTime(CFG.intervalMinMs); // burst fires → ambient should duck

    // Last ambient ramp should target the ducked level (1.0 × -3 dB ≈ 0.708).
    const duckedTarget = ambientGain.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0];
    expect(duckedTarget).toBeCloseTo(dBToGain(-3), 5);

    // Burst ends — ambient should ramp back up to the pre-duck level.
    jest.advanceTimersByTime(CFG.fadeInMs + CFG.burstDurationMs);
    const restoredTarget = ambientGain.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0];
    expect(restoredTarget).toBe(1.0);
  });

  it("restores ambient gain when a burst is hard-stopped", async () => {
    const engine = await loadedEngine();
    const ambientGain = ctx().gains[0];
    engine.setAmbientGain(1.0);

    engine.startTriggerScheduler(CFG);
    jest.advanceTimersByTime(CFG.intervalMinMs); // burst fires → ducked
    ambientGain.gain.linearRampToValueAtTime.mockClear();

    engine.stopTriggerScheduler(); // hard-stop path
    const restoredTarget = ambientGain.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0];
    expect(restoredTarget).toBe(1.0);
  });
});

describe("AudioEngine / live config setters", () => {
  it("are no-ops before a scheduler config exists", async () => {
    const engine = await loadedEngine();
    expect(() => {
      engine.setTriggerPeakGain(0.9);
      engine.setIntervalRange(10, 20);
      engine.setBurstDuration(123);
    }).not.toThrow();
  });

  it("setTriggerPeakGain ramps live when a burst is active", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG);
    jest.advanceTimersByTime(CFG.intervalMinMs); // burst active
    const triggerGain = ctx().gains[1];
    triggerGain.gain.linearRampToValueAtTime.mockClear();

    engine.setTriggerPeakGain(0.8);
    expect(triggerGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.8, expect.any(Number));
  });

  it("setIntervalRange and setBurstDuration update the running config", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG);
    expect(() => {
      engine.setIntervalRange(50, 60);
      engine.setBurstDuration(200);
    }).not.toThrow();
  });
});

describe("AudioEngine / spike + normalize", () => {
  it("onSpike pauses the scheduler and fades out an active burst", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG);
    jest.advanceTimersByTime(CFG.intervalMinMs);
    expect(engine.isBurstActive).toBe(true);

    engine.onSpike();
    engine.onSpike(); // already paused → no-op
    jest.advanceTimersByTime(2600); // scheduled hard-stop of the faded burst
    expect(engine.isBurstActive).toBe(false);
  });

  it("onNormalized resumes the scheduler after the grace period", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG);
    jest.advanceTimersByTime(CFG.intervalMinMs);
    engine.onSpike();
    jest.advanceTimersByTime(2600);

    engine.onNormalized();
    engine.onNormalized(); // resets the grace timer; still paused
    jest.advanceTimersByTime(30_000); // grace elapses → scheduler resumes
    jest.advanceTimersByTime(CFG.intervalMinMs); // next burst fires
    expect(engine.isBurstActive).toBe(true);
  });

  it("onNormalized is a no-op when the scheduler isn't paused", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG);
    expect(() => engine.onNormalized()).not.toThrow();
  });

  it("the grace timer bails out if the context closed in the meantime", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG);
    jest.advanceTimersByTime(CFG.intervalMinMs);
    engine.onSpike();
    jest.advanceTimersByTime(2600);
    engine.onNormalized();

    ctx().close(); // state → "closed" without clearing the grace timer
    jest.advanceTimersByTime(30_000); // grace fires, sees closed ctx, returns early
    jest.advanceTimersByTime(CFG.intervalMinMs);
    expect(engine.isBurstActive).toBe(false);
  });
});

describe("AudioEngine / voice overlay", () => {
  it("playVoiceClip resolves immediately for an out-of-range index", async () => {
    const engine = await loadedEngine();
    await expect(engine.playVoiceClip(99)).resolves.toBeUndefined();
  });

  it("plays a voice clip and resolves when the clip ends via timeout", async () => {
    const engine = await loadedEngine();
    const p = engine.playVoiceClip(0);
    jest.advanceTimersByTime(350); // interrupt-settle delay → source created + started
    jest.advanceTimersByTime(1 * 1000 + 300); // buffer duration (1s) + tail → finish
    await expect(p).resolves.toBeUndefined();
  });

  it("resolves via onEnded and ignores the later timeout (double-finish guard)", async () => {
    const engine = await loadedEngine();
    const p = engine.playVoiceClip(1);
    jest.advanceTimersByTime(350);
    const voiceSrc = ctx().sources[ctx().sources.length - 1];
    voiceSrc.onEnded?.(); // finish via onEnded first
    await expect(p).resolves.toBeUndefined();
    jest.advanceTimersByTime(2000); // late timeout finish → guarded no-op
  });

  it("stopVoice cuts a mid-flight clip immediately (v1.1.0 'Need a moment')", async () => {
    const engine = await loadedEngine();
    void engine.playVoiceClip(0);
    jest.advanceTimersByTime(350); // settle delay → source created + started
    const voiceSrc = ctx().sources[ctx().sources.length - 1];
    expect(voiceSrc.stop).not.toHaveBeenCalled();
    engine.stopVoice();
    expect(voiceSrc.stop).toHaveBeenCalledTimes(1);
  });

  it("stopVoice is a no-op when no voice clip is active", () => {
    const engine = new AudioEngine();
    expect(() => engine.stopVoice()).not.toThrow();
  });

  it("stopVoice swallows a throw from the underlying source.stop()", async () => {
    const engine = await loadedEngine();
    void engine.playVoiceClip(0);
    jest.advanceTimersByTime(350);
    const voiceSrc = ctx().sources[ctx().sources.length - 1];
    voiceSrc.stop.mockImplementation(() => {
      throw new Error("already stopped");
    });
    expect(() => engine.stopVoice()).not.toThrow();
  });

  // v1.1.6 branches — voice-on-voice cut + ambient duck + duck restore.
  it("playVoiceClip cuts an in-flight voice clip when a new one starts", async () => {
    const engine = await loadedEngine();
    void engine.playVoiceClip(0);
    jest.advanceTimersByTime(350);
    const firstVoice = ctx().sources[ctx().sources.length - 1];
    expect(firstVoice.stop).not.toHaveBeenCalled();
    // Second playVoiceClip should stop the first source immediately.
    void engine.playVoiceClip(1);
    expect(firstVoice.stop).toHaveBeenCalledTimes(1);
  });

  it("playVoiceClip swallows a throw from the pre-existing voice source's stop()", async () => {
    const engine = await loadedEngine();
    void engine.playVoiceClip(0);
    jest.advanceTimersByTime(350);
    const firstVoice = ctx().sources[ctx().sources.length - 1];
    firstVoice.stop.mockImplementation(() => {
      throw new Error("already stopped");
    });
    // The second play call must not throw despite the first source's stop() throwing.
    expect(() => void engine.playVoiceClip(1)).not.toThrow();
  });

  it("ducks ambient on voice start and restores on voice end", async () => {
    const engine = await loadedEngine();
    const ambientGain = ctx().gains[0];
    // Baseline the ambient at 1.0 and clear the ramp history so we can inspect
    // the voice-duck ramps in isolation.
    engine.setAmbientGain(1.0);
    ambientGain.gain.linearRampToValueAtTime.mockClear();

    void engine.playVoiceClip(0);
    jest.advanceTimersByTime(350); // settle delay → voice starts, ambient ducks

    // Last ramp targets 1.0 * dBToGain(-9) ≈ 0.355.
    const duckedTarget = ambientGain.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0];
    expect(duckedTarget).toBeCloseTo(dBToGain(-9), 5);

    // Play out the voice — buffer=1s → finish at +300ms after that.
    jest.advanceTimersByTime(1 * 1000 + 300);
    const restoredTarget = ambientGain.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0];
    expect(restoredTarget).toBe(1.0);
  });

  it("stopVoice restores the ambient duck it would otherwise leak", async () => {
    const engine = await loadedEngine();
    const ambientGain = ctx().gains[0];
    engine.setAmbientGain(1.0);

    void engine.playVoiceClip(0);
    jest.advanceTimersByTime(350); // voice active, ambient ducked
    ambientGain.gain.linearRampToValueAtTime.mockClear();

    engine.stopVoice();
    // stopVoice bypasses the natural finish() restore — verify it restores
    // ambient inline instead.
    const restoredTarget = ambientGain.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0];
    expect(restoredTarget).toBe(1.0);
  });
});

describe("AudioEngine / gain + lifecycle", () => {
  it("setAmbientGain clamps to [silence, 1] and ramps", async () => {
    const engine = await loadedEngine();
    const ambientGain = ctx().gains[0];

    engine.setAmbientGain(2); // clamps to 1
    expect(ambientGain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(1, expect.any(Number));

    engine.setAmbientGain(-1); // clamps to silence
    expect(ambientGain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(SILENCE_GAIN, expect.any(Number));
  });

  it("freezeGain falls back to setValueAtTime when cancelAndHoldAtTime is absent", async () => {
    const engine = await loadedEngine();
    const ambientGain = ctx().gains[0];
    // Simulate a platform without cancelAndHoldAtTime.
    (ambientGain.gain as unknown as { cancelAndHoldAtTime?: unknown }).cancelAndHoldAtTime =
      undefined;

    engine.setAmbientGain(0.5);
    expect(ambientGain.gain.setValueAtTime).toHaveBeenCalled();
  });

  it("pauseAll and resumeAll drive the context", async () => {
    const engine = await loadedEngine();
    // The engine ctor calls ctx.resume() proactively (iOS suspended-state
    // workaround), so clear the call count before exercising the explicit
    // pause/resume API the test cares about.
    ctx().resume.mockClear();
    await engine.pauseAll();
    await engine.resumeAll();
    expect(ctx().suspend).toHaveBeenCalledTimes(1);
    expect(ctx().resume).toHaveBeenCalledTimes(1);
  });

  it("fadeOutAll stops bursts and ramps ambient to zero (default + custom duration)", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG);
    jest.advanceTimersByTime(CFG.intervalMinMs);

    engine.fadeOutAll(); // default 3s
    expect(engine.isBurstActive).toBe(false);
    const ambientGain = ctx().gains[0];
    expect(ambientGain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, expect.any(Number));

    expect(() => engine.fadeOutAll(5)).not.toThrow(); // custom duration
  });

  it("destroy clears timers, stops the ambient source, and closes the context", async () => {
    const engine = await loadedEngine();
    await engine.startAmbient();
    engine.startTriggerScheduler(CFG);
    jest.advanceTimersByTime(CFG.intervalMinMs);

    // Make the ambient source's stop throw to exercise destroy()'s try/catch.
    ctx().sources[0].stop.mockImplementation(() => {
      throw new Error("already stopped");
    });

    expect(() => engine.destroy()).not.toThrow();
    expect(ctx().close).toHaveBeenCalledTimes(1);
  });
});

describe("AudioEngine / guard branches", () => {
  it("setTriggerPeakGain updates config without ramping when no burst is active", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG); // config set, but no burst fired yet
    const triggerGain = ctx().gains[1];
    triggerGain.gain.linearRampToValueAtTime.mockClear();

    engine.setTriggerPeakGain(0.7);
    expect(triggerGain.gain.linearRampToValueAtTime).not.toHaveBeenCalled();
  });

  it("onSpike pauses without a fade when no burst is active", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG); // scheduled, not yet fired
    expect(() => engine.onSpike()).not.toThrow();
    expect(engine.isBurstActive).toBe(false);
  });

  it("playVoiceClip does not reschedule while the scheduler is paused", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG);
    engine.onSpike(); // paused
    const p = engine.playVoiceClip(0);
    jest.advanceTimersByTime(350);
    jest.advanceTimersByTime(1 * 1000 + 300);
    await expect(p).resolves.toBeUndefined();
  });

  it("destroy clears a pending grace timer", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG);
    jest.advanceTimersByTime(CFG.intervalMinMs);
    engine.onSpike();
    jest.advanceTimersByTime(2600);
    engine.onNormalized(); // sets a grace timer
    expect(() => engine.destroy()).not.toThrow();
  });

  it("stopTriggerScheduler during the fade-out window clears the cleanup timer", async () => {
    const engine = await loadedEngine();
    engine.startTriggerScheduler(CFG);
    jest.advanceTimersByTime(CFG.intervalMinMs); // burst fires
    jest.advanceTimersByTime(CFG.fadeInMs + CFG.burstDurationMs); // burst ends → cleanup timer pending
    engine.stopTriggerScheduler();
    expect(engine.isBurstActive).toBe(false);
  });

  it("destroy on an unstarted engine is a safe no-op", () => {
    const engine = new AudioEngine();
    expect(() => engine.destroy()).not.toThrow();
    expect(ctx().close).toHaveBeenCalledTimes(1);
  });
});
