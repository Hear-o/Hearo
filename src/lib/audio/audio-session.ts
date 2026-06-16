import { AudioManager } from "react-native-audio-api";

// Configure AND activate the iOS audio session. setAudioSessionOptions alone
// is not enough — it sets the category (playback continues through the mute
// switch, soloAmbient doesn't) but until setAudioSessionActivity(true) calls
// [AVAudioSession setActive: YES] natively, the session is configured but
// not actually routing audio.
//
// observeAudioInterruptions handles phone calls / Siri / other apps grabbing
// audio focus — without it, the session can be left inactive after an
// interruption and silence persists until app restart.
//
// Android ignores these options; safe to call cross-platform.
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
    // Bridge not available (web platform, jest, or pre-link) — silently skip.
    // The session falls back to the library's default category; sessions
    // running outside an iOS dev/TestFlight build don't need this anyway.
  }
}

/** Resolves once the iOS audio session is configured + active. Kicked off at
 *  module import (i.e. at app launch) so it runs in parallel with everything
 *  else; consumers that start playback (`useAudioEngine` load entry points)
 *  await this before touching the audio graph so we never race the native
 *  AVAudioSession activation.
 *
 *  CodeRabbit flagged this race in PR #58: without a gate, a deep link
 *  straight to /session could mount useAudioEngine and call startAmbient
 *  before activation completed, producing silent playback. */
export const audioSessionReady: Promise<void> = configureAudioSession();
