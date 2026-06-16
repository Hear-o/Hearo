import "@/global.css";

import { useEffect } from "react";
import { I18nManager, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AudioManager } from "react-native-audio-api";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  FrankRuhlLibre_400Regular,
  FrankRuhlLibre_500Medium,
} from "@expo-google-fonts/frank-ruhl-libre";
import { Heebo_400Regular, Heebo_500Medium } from "@expo-google-fonts/heebo";

import { CrisisSheet } from "@/components/features/crisis/CrisisSheet";
import { isRTL } from "@/lib/ui/i18n";
import { configureNotificationHandler, reassertSchedule } from "@/lib/integrations/reminders";

SplashScreen.preventAutoHideAsync().catch(() => {});

// One-time, module-level: tells expo-notifications how to render notifications
// that arrive while the app is in the foreground. Safe to call at import time.
configureNotificationHandler();

// Configure AND activate the iOS audio session before any AudioContext is
// created. setAudioSessionOptions alone is not enough — it sets the
// category (playback continues through mute switch, soloAmbient doesn't)
// but until setAudioSessionActivity(true) calls [AVAudioSession setActive:
// YES] natively, the session is configured but not actually routing audio.
// The first iOS audio fix (ios-v1.0.3) only did the configure step; this
// adds the activate step that was missing.
//
// observeAudioInterruptions handles phone calls / Siri / other apps
// grabbing audio focus — without it, the session can be left inactive
// after an interruption and silence persists until app restart.
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
    // The session will fall back to the library's default category; sessions
    // running outside an iOS dev/TestFlight build don't need this anyway.
  }
}

// Fire-and-forget at module init. The promise resolves before any
// AudioContext is constructed inside a session screen because sessions
// require user navigation, which always lags app launch by several
// hundred ms.
void configureAudioSession();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    FrankRuhlLibre_400Regular,
    FrankRuhlLibre_500Medium,
    Heebo_400Regular,
    Heebo_500Medium,
  });

  useEffect(() => {
    const shouldBeRTL = isRTL();
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
      // Re-register any persisted daily reminder with the OS scheduler.
      // Idempotent: a no-op when no schedule is stored.
      void reassertSchedule();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View className="flex-1 bg-bg" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#F2EBDD" }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#F2EBDD" },
          animation: "fade",
        }}
      />
      <CrisisSheet />
    </GestureHandlerRootView>
  );
}
