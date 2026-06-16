import { AudioManager } from "react-native-audio-api";

// Configure AND activate the audio session at app launch. Cross-platform:
//
// iOS: setAudioSessionOptions alone is not enough — it sets the category
// (playback continues through the mute switch, soloAmbient doesn't) but
// until setAudioSessionActivity(true) calls [AVAudioSession setActive: YES]
// natively, the session is configured but not actually routing audio.
// observeAudioInterruptions handles phone calls / Siri / other apps grabbing
// audio focus — without it, the session can be left inactive after an
// interruption and silence persists until app restart.
//
// Android: AudioManager silently ignores the iOS-prefixed options; the
// activity flag maps to the audio-focus request internally. Safe to call
// without a platform branch.
async function configureAudioSession(): Promise<void> {
  try {
    AudioManager.setAudioSessionOptions({
      iosCategory: "playback",
      iosMode: "default",
      iosOptions: ["allowBluetoothA2DP", "allowAirPlay"],
    });
    AudioManager.observeAudioInterruptions(true);
    await AudioManager.setAudioSessionActivity(true);
  } catch {
    // Native bridge unavailable (jest, or a partially-linked build). On a
    // properly built TestFlight / dev binary this never enters the catch.
    // The session falls back to the library's default category — fine for
    // the tests; silence on a real device here is a build problem, not a
    // runtime one.
  }
}

/** Resolves once the audio session is configured + active. Kicked off at
 *  module import (i.e. at app launch) so it runs in parallel with everything
 *  else; consumers that start playback (`useAudioEngine` load entry points)
 *  await this before touching the audio graph so we never race the native
 *  session activation (load-bearing on iOS, cheap on Android). */
export const audioSessionReady: Promise<void> = configureAudioSession();
