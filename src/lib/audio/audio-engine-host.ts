// Module-level singleton ownership for AudioEngine.
//
// Before v1.0.9 the engine was constructed inside useAudioEngine() and
// destroyed on hook-unmount. That worked when only /session used it, but the
// /preparing screen now needs to preload buffers and start the disclaimer
// voice BEFORE the user lands on /session. Sharing a single engine instance
// across both routes keeps the AudioContext, decoded buffers, and any
// in-flight source nodes intact through the route transition.
//
// Lifecycle:
//   getAudioEngine()      — first call constructs, subsequent calls reuse.
//   releaseAudioEngine()  — destroy + reset. Called on /after entry (session
//                           is over) or before a fresh session is prepped.
//
// Tests: each test that touches AudioEngine should call releaseAudioEngine()
// in beforeEach to guarantee isolation (the singleton state otherwise persists
// across test files when jest shares workers).

import { AudioEngine } from "./audio-engine";

let instance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!instance) {
    instance = new AudioEngine();
  }
  return instance;
}

export function releaseAudioEngine(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}

/** True iff a live engine is currently held. Useful for screens that should
 *  only run if upstream prep (e.g. /preparing) actually created one. */
/* istanbul ignore next — convenience query not exercised by current tests. */
export function hasAudioEngine(): boolean {
  return instance !== null;
}
