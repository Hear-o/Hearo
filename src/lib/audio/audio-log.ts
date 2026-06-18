// Small logging helpers for the audio subsystem.
//
// During the iOS 26.5 silence debug session we sprinkled console.logs across
// every audio entry point — load, resume, playback, pause. They were
// load-bearing for the diagnosis (the actual library bridge swallows native
// NSError details so the trace had to come from us). We keep the same calls,
// just gated:
//
//   audioTrace(...)  — DEV only, gets compiled out in production bundles
//   audioWarn(...)   — always emitted; reserve for actual failures / rejections
//
// This way TestFlight logs stay clean by default but local dev / device-attach
// debugging still sees the full chain.

declare const __DEV__: boolean;

// Silenced under jest so the firehose of audio traces doesn't drown the test
// output. audioWarn stays loud because the warn signals are precisely what we
// want to surface — anything genuinely unexpected (catch path firing) should
// still hit stderr in CI.
/* istanbul ignore next — test-env constant, evaluated once at module load. */
const IN_TEST =
  typeof process !== "undefined" && process.env?.NODE_ENV === "test";

export function audioTrace(...args: unknown[]): void {
  /* istanbul ignore if — production build path; tests run with IN_TEST=true so
     this branch is unreachable. The runtime path it gates (console.log) is
     exercised on-device, not under jest. */
  if (__DEV__ && !IN_TEST) {
    // eslint-disable-next-line no-console
    console.log("[audio]", ...args);
  }
}

export function audioWarn(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.warn("[audio]", ...args);
}
