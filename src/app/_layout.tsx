import "@/global.css";

import { useEffect } from "react";
import { I18nManager, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import {
  FrankRuhlLibre_400Regular,
  FrankRuhlLibre_500Medium,
} from "@expo-google-fonts/frank-ruhl-libre";
import { Heebo_400Regular, Heebo_500Medium } from "@expo-google-fonts/heebo";

import { CrisisSheet } from "@/components/features/crisis/CrisisSheet";
import { SettingsSheet } from "@/components/features/settings/SettingsSheet";
import { applyStoredLanguage, isRTL } from "@/lib/ui/i18n";
import { bootstrapTextDirection } from "@/lib/ui/rtlBootstrap";
import { configureNotificationHandler, reassertSchedule } from "@/lib/integrations/reminders";

// Module-load side effect: install the app-wide Text default (textAlign +
// writingDirection based on I18nManager.isRTL). Fires ONCE, before any
// screen renders. See rtlBootstrap.ts for the cascade rationale.
bootstrapTextDirection();
// Import for its side effect: kicks off iOS audio-session configure+activate
// at app launch. Consumers that start playback await `audioSessionReady`.
import "@/lib/audio/audio-session";

SplashScreen.preventAutoHideAsync().catch(() => {});

// One-time, module-level: tells expo-notifications how to render notifications
// that arrive while the app is in the foreground. Safe to call at import time.
configureNotificationHandler();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    FrankRuhlLibre_400Regular,
    FrankRuhlLibre_500Medium,
    Heebo_400Regular,
    Heebo_500Medium,
  });

  useEffect(() => {
    // v1.1.10: native AppDelegate now forces RTL(true) on first cold launch
    // (see ios/Hearo/AppDelegate.swift), so the Hebrew default no longer
    // depends on this JS reload dance at all. This effect only runs for
    // English opt-outs: if the user picked English in Settings, we need to
    // flip forceRTL(false) and restart so the layout drops RTL.
    //
    // The 500ms delay before reloadAsync is critical. I18nManager.forceRTL
    // updates the JS-side flag synchronously, then dispatches an async
    // bridge call to write RCTI18nUtil_forceRTL to NSUserDefaults. If we
    // called reloadAsync immediately, the reload could read the stale flag
    // from UserDefaults and land back in the old direction — the v1.1.6
    // bug where users reported "RTL still broken" despite the reload.
    void applyStoredLanguage().then(() => {
      const shouldBeRTL = isRTL();
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
        setTimeout(() => {
          Updates.reloadAsync().catch(() => {
            /* dev build or Updates unavailable — manual reload required */
          });
        }, 500);
      }
    });
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
          // Native-stack's own fade can't be tuned consistently cross-platform
          // (animationDuration is iOS-only; Android has no public override) —
          // disable it entirely and let each screen's usePageFade() drive an
          // identical Reanimated fade on both platforms instead.
          animation: "none",
          // Every screen has its own explicit back/close control, so the
          // iOS edge-swipe / Android back-gesture is redundant — and on the
          // session flow specifically it was letting an accidental swipe
          // dump the user out mid-session. Disabled everywhere for consistency.
          gestureEnabled: false,
        }}
      />
      <CrisisSheet />
      <SettingsSheet />
    </GestureHandlerRootView>
  );
}
