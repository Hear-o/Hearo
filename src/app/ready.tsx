import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";
import { Icon } from "@/components/common/Icon";
import { useSwipeForward } from "@/hooks/useSwipeForward";
import { getScene, getSound, localize } from "@/lib/content/content";
import { useDisplayName } from "@/lib/ui/displayName";
import { useSessionStore } from "@/lib/storage/session-store";
import { getPsychoEducationSeen } from "@/lib/storage/storage";
import { useSettingsSheetStore } from "@/lib/storage/settings-sheet-store";
import { getTimeOfDay } from "@/lib/ui/timeOfDay";
import { fonts, tokens } from "@/lib/ui/tokens";

/** Pre-session preview screen.
 *
 *  v1.1.0 split: what used to be /home (greeting + scene preview + Begin) lives
 *  here. The real /home is now a separate landing surface with the sessions
 *  counter + Begin CTA. Flow: /home → /ready → /preparing → /session.
 *
 *  Owns: the warm time-of-day greeting, the selected scene image (so the user
 *  sees where they're about to walk into), the activity + trigger description,
 *  Begin / Change / Need-a-moment affordances. */
export default function Ready() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { scene, sounds, durationMinutes } = useSessionStore();
  const { name } = useDisplayName();
  const band = getTimeOfDay();

  const sceneRecord = getScene(scene);
  const sceneActivity = localize(sceneRecord.activity, i18n.language);
  // The `still` field can be a require()'d module (number for bundled assets)
  // or a string URL (future CDN delivery). Image's `source` prop wants
  // ImageSourcePropType, so normalize the string case into a { uri } object.
  const stillSource =
    typeof sceneRecord.media.still === "string"
      ? { uri: sceneRecord.media.still }
      : sceneRecord.media.still;
  const primarySound = sounds[0];
  const withLine = primarySound
    ? t("home.withSound", {
        sound: localize(getSound(primarySound).inAction, i18n.language),
      })
    : null;

  async function handleBegin() {
    const seen = await getPsychoEducationSeen();
    if (seen) {
      router.push({ pathname: "/preparing", params: { scene } });
    } else {
      router.push({ pathname: "/psychoed", params: { scene } });
    }
  }

  const swipeGesture = useSwipeForward(handleBegin);

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
              <Icon name="settings" size={28} color={tokens.text} />
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
              fontSize: 32,
              lineHeight: 44,
              marginTop: 24,
              textAlign: "left",
            }}
          >
            {name
              ? t(`home.greeting.${band}`, { name })
              : t(`home.greetingNoName.${band}`)}
          </Text>

          {/* Scene image — the picture the user asked for in the gap between
              greeting and activity description. Uses the existing scene still
              (require()'d in content.ts) so no new asset is needed. */}
          {stillSource ? (
            <View style={{ marginTop: 24, alignItems: "center" }}>
              <Image
                source={stillSource}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 16,
                }}
                resizeMode="cover"
                accessibilityLabel={localize(sceneRecord.label, i18n.language)}
              />
            </View>
          ) : null}

          <View className="flex-1 justify-center">
            <Text
              style={{
                color: tokens.textMute,
                fontFamily: fonts.body,
                fontSize: 13,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                marginBottom: 10,
                textAlign: "left",
              }}
            >
              {t("home.todaysExperience")}
            </Text>

            <Text
              style={{
                color: tokens.text,
                fontFamily: fonts.display,
                fontSize: 26,
                lineHeight: 34,
                textAlign: "left",
              }}
            >
              {sceneActivity}
            </Text>

            {withLine ? (
              <Text
                style={{
                  color: tokens.textMute,
                  fontFamily: fonts.body,
                  fontSize: 17,
                  marginTop: 4,
                  textAlign: "left",
                }}
              >
                {withLine}
              </Text>
            ) : null}

            <Text
              style={{
                color: tokens.textMute,
                fontFamily: fonts.body,
                fontSize: 14,
                marginTop: 14,
                textAlign: "left",
              }}
            >
              {t("home.durationHint", { count: durationMinutes })}
            </Text>
          </View>

          <View className="pb-2">
            <Pressable
              onPress={handleBegin}
              accessibilityRole="button"
              accessibilityHint="Tap or swipe to begin today's session"
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
                  fontSize: 18,
                }}
              >
                {t("home.begin")}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/setup")}
            hitSlop={8}
            style={{ alignSelf: "center", paddingVertical: 14 }}
          >
            <Text
              style={{
                color: tokens.textMute,
                fontFamily: fonts.body,
                fontSize: 14,
              }}
            >
              {t("home.change")}
            </Text>
          </Pressable>
        </View>
      </GestureDetector>
    </SafeAreaView>
  );
}
