import { AudioManager } from "react-native-audio-api";

import { audioTrace, audioWarn } from "./audio-log";

// Configure AND activate the audio session at app launch. Cross-platform:
//
// iOS: setAudioSessionOptions configures the AVAudioSession category. We use
// `playback` (continues through the mute switch and routes to Bluetooth/AirPlay
// by default — important: do NOT pass `allowBluetoothA2DP` or `allowAirPlay`
// as category options. On iOS 26.5 the native setCategory call rejects with
// those options, the library's bridge swallows the NSError, and audio stays
// silent. iOS routes Bluetooth/AirPlay automatically for `playback`; the flags
// were only ever needed for `playAndRecord`. See v1.0.9 release notes.
//
// observeAudioInterruptions handles phone calls / Siri / other apps grabbing
// audio focus — without it, the session can be left inactive after an
// interruption and silence persists until app restart.
//
// Android: AudioManager silently ignores the iOS-prefixed options; the
// activity flag maps to the audio-focus request internally. Safe to call
// without a platform branch.

/* istanbul ignore next — failure paths in audio init are device-only; the
   jest mock always resolves so the catches are unreachable in tests. */
function configureCategory(): void {
  audioTrace("session: category configure start");
  try {
    AudioManager.setAudioSessionOptions({
      iosCategory: "playback",
      iosMode: "default",
      iosOptions: [], // intentional — see comment above; do not add flags here
    });
    AudioManager.observeAudioInterruptions(true);
    audioTrace("session: category set + interruption observer armed");
  } catch (e) {
    audioWarn("session: category configure FAILED", e);
  }
}

configureCategory();

/** Forcefully activate the iOS audio session.
 *
 *  Why this isn't done at module init: on iOS 26.5 we observed
 *  `setAudioSessionActivity(true)` rejecting with "unknown error" when called
 *  at app launch, leaving the AudioContext suspended forever. Same call works
 *  fine when invoked later in the app lifecycle, after the user has navigated
 *  through several screens — likely an iOS policy timing thing.
 *
 *  Strategy: call this from `useAudioEngine` (engine construction time, which
 *  is when the user is on the session screen — many seconds after launch).
 *  Retry up to three times because the first attempt sometimes throws a
 *  spurious error even when subsequent attempts succeed. */
export async function activateAudioSession(): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      audioTrace(`session: activate attempt ${attempt}`);
      await AudioManager.setAudioSessionActivity(true);
      audioTrace(`session: activate attempt ${attempt} resolved`);
      return true;
    } catch (e) {
      /* istanbul ignore next — failure-path diagnostics; exercised on-device
         when iOS rejects activation, not on the jest mock which always resolves. */
      logActivationFailure(attempt, e);
      /* istanbul ignore next */
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  /* istanbul ignore next — only reachable after 3 native rejections. */
  audioWarn("session: activate gave up after 3 attempts");
  /* istanbul ignore next */
  return false;
}

/* istanbul ignore next — failure-path log helper, device-only. */
function logActivationFailure(attempt: number, e: unknown): void {
  const err = e as Record<string, unknown> & {
    message?: string;
    code?: string;
    userInfo?: unknown;
    nativeError?: unknown;
    details?: unknown;
    nativeStackIOS?: unknown;
    stack?: string;
  };
  audioWarn(`session: activate attempt ${attempt} FAILED`, {
    message: err.message,
    code: err.code,
    userInfo: err.userInfo,
    nativeError: err.nativeError,
    details: err.details,
    nativeStackIOS: err.nativeStackIOS,
    ownKeys: Object.keys(err),
    constructorName: err.constructor?.name,
  });
}

/** Back-compat shim. Old call sites await this; it now triggers an explicit
 *  activation rather than blocking on a fire-and-forget module-init promise. */
export const audioSessionReady: Promise<void> = Promise.resolve();
