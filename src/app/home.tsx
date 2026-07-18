import { useCallback, useState } from "react";
import { I18nManager, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Svg, { Path } from "react-native-svg";

import { ScreenHeader } from "@/components/common/ScreenHeader";
import { Icon } from "@/components/common/Icon";
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

  // Pluralization is i18next's job; we still need a small helper for the
  // "0 sessions" / "1 session" / "N sessions" English forms. i18next handles
  // HE plurals via the `_one` / `_other` suffix on the key.
  const sessionsLabel = t("home.sessionsCount", {
    count: sessionsCount,
    defaultValue: `${sessionsCount} sessions`,
  });

  return (
    <SafeAreaView className="flex-1 bg-bg">
        <View className="flex-1 px-8">
          <ScreenHeader
            paddingX={0}
            left={
              <Pressable
                hitSlop={16}
                onPress={() => useSettingsSheetStore.getState().open()}
                accessibilityLabel={t("settings.open")}
              >
                <Icon name="settings" size={28} color={tokens.text} />
              </Pressable>
            }
          />

          <View className="pt-10">
            <View style={{ width: 28, height: 1, backgroundColor: tokens.accent }} />
          </View>

          <Text
            style={{
              color: tokens.text,
              fontFamily: fonts.display,
              ...typeScale.hero,
              fontSize: 44,
              lineHeight: 54,
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
                fontSize: 15,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                marginBottom: 10,
                textAlign: "left",
              }}
            >
              {t("home.thoughtLabel")}
            </Text>
            <Text
              style={{
                color: tokens.text,
                fontFamily: fonts.body,
                ...typeScale.body,
                fontSize: 21,
                lineHeight: 29,
                opacity: 0.85,
              }}
            >
              {affirmation}
            </Text>
          </View>

          {/* Sessions-completed counter — the only progress surface we ship
              in v1.1.0. Trend/streak/minutes are backlog. */}
          <View style={{ marginTop: 56 }}>
            <Text
              style={{
                color: tokens.textMute,
                fontFamily: fonts.body,
                fontSize: 15,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                marginBottom: 8,
                textAlign: "left",
              }}
            >
              {t("home.progress")}
            </Text>
            <Text
              style={{
                color: tokens.text,
                fontFamily: fonts.display,
                fontSize: 44,
                lineHeight: 54,
                textAlign: "left",
              }}
            >
              {sessionsLabel}
            </Text>
          </View>

          <View className="flex-1" />

          {/* v1.2.0: home splits into two paths — Practice (the existing
              sound-exposure flow) and Companion (new v1 behavioral roadmap
              with a BETA tag while clinical review is pending). Cards stack
              vertically rather than side-by-side so labels stay readable in
              Hebrew and don't get truncated on small phones. */}
          <View className="pb-10" style={{ gap: 20 }}>
            <Pressable
              onPress={handleBegin}
              accessibilityRole="button"
              accessibilityHint="Begin a practice session"
              hitSlop={8}
              style={{
                borderRadius: 20,
                paddingVertical: 20,
                paddingHorizontal: 24,
                backgroundColor: tokens.accent,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                shadowColor: tokens.accent,
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.45,
                shadowRadius: 18,
                elevation: 6,
              }}
            >
              <View>
                <Text
                  style={{
                    color: tokens.sceneText,
                    fontFamily: fonts.displayMedium,
                    fontSize: 26,
                    lineHeight: 28,
                    textAlign: "left",
                  }}
                >
                  {t("companion.practiceCta")}
                </Text>
                <Text
                  style={{
                    color: tokens.sceneTextMute,
                    fontFamily: fonts.body,
                    fontSize: 13,
                    marginTop: 4,
                    textAlign: "left",
                  }}
                >
                  {t("companion.practiceHint")}
                </Text>
              </View>
              <ArrowChip />
            </Pressable>

            <Pressable
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onPress={() => router.push("/companion" as any)}
              accessibilityRole="button"
              accessibilityLabel={t("companion.companionCta")}
              hitSlop={8}
              style={{
                borderRadius: 20,
                paddingVertical: 20,
                paddingHorizontal: 24,
                backgroundColor: tokens.sage,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                shadowColor: tokens.sage,
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.45,
                shadowRadius: 18,
                elevation: 6,
              }}
            >
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text
                    style={{
                      color: tokens.sceneText,
                      fontFamily: fonts.displayMedium,
                      fontSize: 26,
                      lineHeight: 28,
                      textAlign: "left",
                    }}
                  >
                    {t("companion.companionCta")}
                  </Text>
                  <View
                    style={{
                      backgroundColor: "rgba(244,238,227,0.24)",
                      borderRadius: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: tokens.sceneText,
                        fontFamily: fonts.bodyMedium,
                        fontSize: 10,
                        letterSpacing: 1,
                      }}
                    >
                      {t("companion.beta")}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    color: tokens.sceneTextMute,
                    fontFamily: fonts.body,
                    fontSize: 13,
                    marginTop: 4,
                    textAlign: "left",
                  }}
                >
                  {t("companion.companionHint")}
                </Text>
              </View>
              <ArrowChip />
            </Pressable>
          </View>
        </View>
    </SafeAreaView>
  );
}

// Bolder stroke than the shared arrow-right asset (Icon.tsx), scoped to this
// chip only. Reuses that asset's own path/flip logic rather than a new file.
function ArrowChip() {
  const flip = I18nManager.isRTL;
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(244,238,227,0.18)",
      }}
    >
      <View style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path
            fill="none"
            stroke={tokens.sceneText}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3.5}
            d="M.75 12h22.5m-10.5 10.5L23.25 12L12.75 1.5"
          />
        </Svg>
      </View>
    </View>
  );
}
