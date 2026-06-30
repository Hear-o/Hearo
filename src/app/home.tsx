import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector } from "react-native-gesture-handler";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";
import { Icon } from "@/components/common/Icon";
import { useSwipeForward } from "@/hooks/useSwipeForward";
import { getDailyAffirmation } from "@/lib/content/content";
import { useDisplayName } from "@/lib/ui/displayName";
import { useSettingsSheetStore } from "@/lib/storage/settings-sheet-store";
import { getSessionsCompleted, setOnboardedAt } from "@/lib/storage/storage";
import { getTimeOfDay } from "@/lib/ui/timeOfDay";
import { fonts, tokens, type as typeScale } from "@/lib/ui/tokens";

/** Real home / landing surface for returning users.
 *
 *  v1.1.0 split — the previous "home" screen (greeting + scene preview + Begin)
 *  is now /ready. This screen is the app's default destination once onboarding
 *  is complete: the user lands here on every cold-launch (see _layout.tsx).
 *
 *  Owns: time-of-day greeting, lifetime sessions-completed counter, the
 *  primary CTA to begin a new session (routes to /ready), gear (settings),
 *  crisis affordance. */
export default function Home() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { name } = useDisplayName();
  const band = getTimeOfDay();

  const [sessionsCount, setSessionsCount] = useState(0);

  // Daily affirmation — same quote whole day, rotates at local midnight.
  // Pre-clinical review; pending Hirschman pass before user-facing.
  const affirmation = getDailyAffirmation(i18n.language);

  // Refresh on focus so the count updates after a session completes
  // (/after increments and routes back here).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      // Reaching /home through the normal app flow is what "onboarded" means.
      // Stamp it so _layout knows to skip the welcome flow on next launch.
      void setOnboardedAt(Date.now());
      void getSessionsCompleted().then((count) => {
        if (active) setSessionsCount(count);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  // Begin a session goes through Setup (scene + sound pick) every time, so
  // the user explicitly chooses what they're practicing on this run. Setup's
  // "Ready" pushes /ready (the preview with scene image), which then goes to
  // /preparing → /session.
  const handleBegin = () => router.push("/setup");
  const swipeGesture = useSwipeForward(handleBegin);

  // Pluralization is i18next's job; we still need a small helper for the
  // "0 sessions" / "1 session" / "N sessions" English forms. i18next handles
  // HE plurals via the `_one` / `_other` suffix on the key.
  const sessionsLabel = t("home.sessionsCount", {
    count: sessionsCount,
    defaultValue: `${sessionsCount} sessions`,
  });

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <GestureDetector gesture={swipeGesture}>
        <View className="flex-1 px-8">
          <View className="flex-row justify-between items-center pt-2">
            <Pressable
              hitSlop={16}
              onPress={() => useSettingsSheetStore.getState().open()}
              accessibilityLabel={t("settings.open")}
            >
              <Icon name="settings" size={22} color={tokens.text} />
            </Pressable>
            <CrisisAffordance />
          </View>

          <View className="pt-10">
            <View style={{ width: 28, height: 1, backgroundColor: tokens.accent }} />
          </View>

          <Text
            style={{
              color: tokens.text,
              fontFamily: fonts.display,
              ...typeScale.hero,
              marginTop: 24,
            }}
          >
            {name
              ? t(`home.greeting.${band}`, { name })
              : t(`home.greetingNoName.${band}`)}
          </Text>

          {/* Daily affirmation — clinical-team review pending (see content.ts).
              Sits below the greeting in muted color so it reads as "today's
              quiet thought," not a load-bearing UI element. */}
          <View style={{ marginTop: 28 }}>
            <Text
              style={{
                color: tokens.textMute,
                fontFamily: fonts.body,
                fontSize: 13,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              {t("home.thoughtLabel")}
            </Text>
            <Text
              style={{
                color: tokens.text,
                fontFamily: fonts.body,
                ...typeScale.body,
                opacity: 0.85,
              }}
            >
              {affirmation}
            </Text>
          </View>

          {/* Sessions-completed counter — the only progress surface we ship
              in v1.1.0. Trend/streak/minutes are backlog. */}
          <View style={{ marginTop: 32 }}>
            <Text
              style={{
                color: tokens.textMute,
                fontFamily: fonts.body,
                fontSize: 13,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {t("home.progress")}
            </Text>
            <Text
              style={{
                color: tokens.text,
                fontFamily: fonts.display,
                fontSize: 44,
                lineHeight: 50,
              }}
            >
              {sessionsLabel}
            </Text>
          </View>

          <View className="flex-1" />

          <View className="pb-2">
            <Pressable
              onPress={handleBegin}
              accessibilityRole="button"
              accessibilityHint="Tap or swipe to begin a session"
              hitSlop={8}
              style={{
                borderWidth: 1,
                borderColor: tokens.accent,
                borderRadius: 999,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: tokens.accent,
                  fontFamily: fonts.body,
                  ...typeScale.body,
                }}
              >
                {t("home.beginSession")}
              </Text>
            </Pressable>
          </View>

          {/* "Change what's planned" intentionally NOT shown on Home — Setup
              is part of the Begin-a-session flow now, not a preferences side
              trip. The link stays on /ready for users mid-flow who want to
              reconfigure before starting. */}
        </View>
      </GestureDetector>
    </SafeAreaView>
  );
}
