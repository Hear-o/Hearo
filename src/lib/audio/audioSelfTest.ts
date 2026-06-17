// Device/CI audio self-test — proves the native react-native-audio-api engine
// actually PRODUCES SOUND on iOS, not merely that it compiles and links.
//
// Why this exists: the Jest suites run against a fake AudioContext, so they
// verify our wiring but can never prove the native DSP emits a real signal.
// This module runs inside a real (or simulator) build via the hidden
// `audio-selftest` route and measures the engine's output two independent ways:
//
//   1. Offline render — OfflineAudioContext.startRendering() computes the PCM
//      for a synthesized 440 Hz tone. Fully deterministic, needs no audio
//      hardware. This is the GATING signal in CI (a broken/silent engine
//      renders all-zero PCM → RMS 0).
//   2. Realtime tap   — a live AudioContext plays the same tone to the output
//      device AND an AnalyserNode; we read the time-domain samples back. This
//      exercises the exact real-time playback path the app uses and confirms a
//      non-silent signal is flowing through it.
//
// Neither measurement depends on the host having speakers, so both are stable
// on a headless macOS runner. The workflow that drives this is
// .github/workflows/ios-audio.yml.

import { AudioContext, OfflineAudioContext } from 'react-native-audio-api';

const TONE_HZ = 440;
const TONE_GAIN = 0.5;
const SAMPLE_RATE = 44100;
const RENDER_SECONDS = 0.5;
const REALTIME_PLAY_MS = 400;
const ANALYSER_FFT = 2048;

// A signal at least this far from silence is unambiguously "audio is playing".
// The synthesized tone sits near RMS ≈ 0.35 / level ≈ 0.8, so these floors
// leave a wide margin while still failing hard on a silent (zeroed) engine.
const SILENCE_RMS_CEILING = 0.02;
const SILENCE_LEVEL_CEILING = 0.02;

export interface AudioSelfTestResult {
  /** RMS amplitude (0..1) of the offline-rendered tone. */
  offlineRms: number;
  /** Peak absolute amplitude (0..1) of the offline-rendered tone. */
  offlinePeak: number;
  /** Normalized peak deviation from silence (0..1) tapped from the live graph. */
  realtimeLevel: number;
  /** True only when BOTH paths produced a clearly non-silent signal. */
  pass: boolean;
}

/** Root-mean-square of a PCM frame. 0 for digital silence. */
export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i];
  return Math.sqrt(sumSq / samples.length);
}

/** Peak absolute amplitude of a PCM frame. 0 for digital silence. */
export function peak(samples: Float32Array): number {
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > max) max = abs;
  }
  return max;
}

/** Normalized peak deviation from the 8-bit silence midpoint (128). A flat
 *  buffer (all 128) → 0; a full-scale signal → ~1. */
export function levelFromTimeDomain(bytes: Uint8Array): number {
  let maxDev = 0;
  for (let i = 0; i < bytes.length; i++) {
    const dev = Math.abs(bytes[i] - 128);
    if (dev > maxDev) maxDev = dev;
  }
  return maxDev / 128;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Render a synthesized tone offline and measure its amplitude. Deterministic;
 *  this is the signal CI gates on. */
export async function renderToneOffline(): Promise<{ rms: number; peak: number }> {
  const length = Math.floor(SAMPLE_RATE * RENDER_SECONDS);
  const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);

  const osc = offline.createOscillator();
  osc.frequency.value = TONE_HZ;
  const gain = offline.createGain();
  gain.gain.value = TONE_GAIN;

  osc.connect(gain);
  gain.connect(offline.destination);
  osc.start(0);
  osc.stop(RENDER_SECONDS);

  const rendered = await offline.startRendering();
  const data = rendered.getChannelData(0);
  return { rms: rms(data), peak: peak(data) };
}

/** Play a tone through a live AudioContext to the output device + an
 *  AnalyserNode, then read the signal back. Proves the real-time playback path
 *  emits audio (and routes it to `destination` for the optional CI capture). */
export async function measureRealtimeLevel(): Promise<number> {
  const ctx = new AudioContext();
  try {
    const osc = ctx.createOscillator();
    osc.frequency.value = TONE_HZ;
    const gain = ctx.createGain();
    gain.gain.value = TONE_GAIN;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = ANALYSER_FFT;

    osc.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination); // route to the real output device too
    osc.start();

    await delay(REALTIME_PLAY_MS);

    const bytes = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(bytes);
    osc.stop();
    return levelFromTimeDomain(bytes);
  } finally {
    await ctx.close();
  }
}

/** Run both measurements and decide pass/fail. */
export async function runAudioSelfTest(): Promise<AudioSelfTestResult> {
  const { rms: offlineRms, peak: offlinePeak } = await renderToneOffline();
  const realtimeLevel = await measureRealtimeLevel();

  const pass =
    offlineRms > SILENCE_RMS_CEILING && realtimeLevel > SILENCE_LEVEL_CEILING;

  return { offlineRms, offlinePeak, realtimeLevel, pass };
}

/** Single greppable line for CI log scraping (a fallback to the result file).
 *  The workflow asserts on `AUDIO_SELFTEST_RESULT=PASS`. */
export function formatSelfTestLog(result: AudioSelfTestResult): string {
  const verdict = result.pass ? 'PASS' : 'FAIL';
  return (
    `AUDIO_SELFTEST_RESULT=${verdict} ` +
    `offlineRms=${result.offlineRms.toFixed(4)} ` +
    `offlinePeak=${result.offlinePeak.toFixed(4)} ` +
    `realtimeLevel=${result.realtimeLevel.toFixed(4)}`
  );
}
