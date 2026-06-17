jest.mock("react-native-audio-api", () =>
  require("../../../../test/mocks/react-native-audio-api"),
);

import * as audioApi from "../../../../test/mocks/react-native-audio-api";
import {
  rms,
  peak,
  levelFromTimeDomain,
  renderToneOffline,
  measureRealtimeLevel,
  runAudioSelfTest,
  formatSelfTestLog,
} from "@/lib/audio/audioSelfTest";

afterEach(() => {
  audioApi.__setSilent(false);
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("audioSelfTest / signal math", () => {
  it("rms is 0 for an empty frame and for silence, positive for a signal", () => {
    expect(rms(new Float32Array(0))).toBe(0);
    expect(rms(new Float32Array([0, 0, 0]))).toBe(0);
    expect(rms(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5);
  });

  it("peak returns the largest absolute amplitude", () => {
    expect(peak(new Float32Array([0, -0.8, 0.3]))).toBeCloseTo(0.8);
    expect(peak(new Float32Array([0, 0, 0]))).toBe(0);
  });

  it("levelFromTimeDomain maps a flat-128 buffer to 0 and a swing to >0", () => {
    expect(levelFromTimeDomain(new Uint8Array([128, 128, 128]))).toBe(0);
    expect(levelFromTimeDomain(new Uint8Array([128, 228, 28]))).toBeCloseTo(100 / 128);
  });
});

describe("audioSelfTest / offline render", () => {
  it("renders a non-silent tone through OfflineAudioContext", async () => {
    const { rms: r, peak: p } = await renderToneOffline();
    expect(r).toBeGreaterThan(0.02);
    expect(p).toBeGreaterThan(0.02);
  });

  it("reports silence when the engine renders zeroed PCM", async () => {
    audioApi.__setSilent(true);
    const { rms: r, peak: p } = await renderToneOffline();
    expect(r).toBe(0);
    expect(p).toBe(0);
  });
});

describe("audioSelfTest / realtime tap", () => {
  it("reads a non-silent level from the live analyser and closes the context", async () => {
    jest.useFakeTimers();
    const p = measureRealtimeLevel();
    await jest.advanceTimersByTimeAsync(400); // let the tone "play"
    const level = await p;

    expect(level).toBeGreaterThan(0.02);
    // The live graph must route to the output device for the optional CI capture.
    const ctx = audioApi.__lastContext();
    expect(ctx.analysers[0].connect).toHaveBeenCalledWith(ctx.destination);
    expect(ctx.close).toHaveBeenCalledTimes(1);
  });

  it("reads ~0 level when the live signal is silent", async () => {
    audioApi.__setSilent(true);
    jest.useFakeTimers();
    const p = measureRealtimeLevel();
    await jest.advanceTimersByTimeAsync(400);
    expect(await p).toBe(0);
  });
});

describe("audioSelfTest / verdict", () => {
  it("passes when both paths produce a clear signal", async () => {
    jest.useFakeTimers();
    const p = runAudioSelfTest();
    await jest.advanceTimersByTimeAsync(400);
    const result = await p;

    expect(result.pass).toBe(true);
    expect(result.offlineRms).toBeGreaterThan(0.02);
    expect(result.realtimeLevel).toBeGreaterThan(0.02);
    expect(formatSelfTestLog(result)).toContain("AUDIO_SELFTEST_RESULT=PASS");
  });

  it("fails when the engine is silent", async () => {
    audioApi.__setSilent(true);
    jest.useFakeTimers();
    const p = runAudioSelfTest();
    await jest.advanceTimersByTimeAsync(400);
    const result = await p;

    expect(result.pass).toBe(false);
    expect(formatSelfTestLog(result)).toContain("AUDIO_SELFTEST_RESULT=FAIL");
  });
});
