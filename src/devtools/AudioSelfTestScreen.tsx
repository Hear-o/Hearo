// Hidden device/CI diagnostic screen. This file intentionally lives outside
// src/app so Expo Router does not include it in normal production route maps.
// .github/workflows/ios-audio.yml generates a temporary root layout that points
// here only for the EXPO_PUBLIC_AUDIO_SELFTEST=1 CI build.
//
// On mount it runs the native audio self-test (a half-second 440 Hz tone) and:
//   1. writes the result to <Documents>/audio-selftest.json, which CI reads
//      from the simulator's app data container (reliable in a Release build,
//      no Metro / console-forwarding dependency);
//   2. logs a greppable marker as a fallback signal;
//   3. renders the measured numbers on screen for manual / visual runs.
//
// Guarded by EXPO_PUBLIC_AUDIO_SELFTEST as a second layer of defense; the
// workflow sets that flag before building.

import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import "@/lib/audio/audio-session";

import {
  runAudioSelfTest,
  formatSelfTestLog,
  AudioSelfTestResult,
} from "@/lib/audio/audioSelfTest";

const ENABLED = process.env.EXPO_PUBLIC_AUDIO_SELFTEST === "1";
const RESULT_FILE = `${FileSystem.documentDirectory}audio-selftest.json`;

export default function AudioSelfTestScreen() {
  const [result, setResult] = useState<AudioSelfTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ENABLED) return;
    let cancelled = false;

    (async () => {
      try {
        const r = await runAudioSelfTest();
        // Fallback signal: a single greppable line in the device log.
        console.log(formatSelfTestLog(r));
        // Primary signal: a JSON file CI reads from the app data container.
        await FileSystem.writeAsStringAsync(RESULT_FILE, JSON.stringify(r));
        if (!cancelled) setResult(r);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(`AUDIO_SELFTEST_RESULT=FAIL error=${message}`);
        try {
          await FileSystem.writeAsStringAsync(
            RESULT_FILE,
            JSON.stringify({ pass: false, error: message }),
          );
        } catch {
          /* best effort — the log line above is the fallback */
        }
        if (!cancelled) setError(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ENABLED) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text testID="audio-selftest-disabled">audio self-test disabled</Text>
      </View>
    );
  }

  const status = error ? "ERROR" : result ? (result.pass ? "PASS" : "FAIL") : "RUNNING";

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text testID="audio-selftest-status" style={{ fontSize: 20, fontWeight: "600" }}>
        {status}
      </Text>
      {result && (
        <Text testID="audio-selftest-metrics" style={{ marginTop: 12 }}>
          {`offlineRms=${result.offlineRms.toFixed(4)} ` +
            `offlinePeak=${result.offlinePeak.toFixed(4)} ` +
            `realtimeLevel=${result.realtimeLevel.toFixed(4)}`}
        </Text>
      )}
      {error && <Text testID="audio-selftest-error">{error}</Text>}
    </View>
  );
}
