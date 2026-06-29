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
import { configureNotificationHandler, reassertSchedule } from "@/lib/integrations/reminders";
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
    // Apply any user-stored language override before the RTL check fires.
    // applyStoredLanguage() resolves quickly (single AsyncStorage read) and
    // is a no-op when the user has never switched off the Hebrew default.
    void applyStoredLanguage().then(() => {
      const shouldBeRTL = isRTL();
      if (I18nManager.isRTL !== shouldBeRTL) {
        // I18nManager.forceRTL persists to native UserDefaults but the layout
        // direction only flips on the NEXT app launch on iOS. Setting it
        // without reloading leaves the user looking at Hebrew text inside an
        // LTR-laid-out screen — the v1.1.5 bug ("RTL not fixed across the
        // app"). expo-updates' reloadAsync triggers a clean restart so the
        // persisted direction takes effect immediately. Reload fires only
        // when the flag actually changes (first launch after 1.1.4 update,
        // or after the Settings toggle), so steady-state launches don't
        // re-reload. In dev, Updates may not be wired — we swallow that
        // error and accept that dev RTL-toggle requires a manual reload.
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
        Updates.reloadAsync().catch(() => {
          /* dev build or Updates unavailable — manual reload required */
        });
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
          animation: "fade",
        }}
      />
      <CrisisSheet />
      <SettingsSheet />
    </GestureHandlerRootView>
  );
}
