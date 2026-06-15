import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";
import { Icon } from "@/components/common/Icon";
import { getScene, getSound, localize } from "@/lib/content/content";
import { useDisplayName } from "@/lib/ui/displayName";
import { useSessionStore } from "@/lib/storage/session-store";
import { getPsychoEducationSeen } from "@/lib/storage/storage";
import { getTimeOfDay } from "@/lib/ui/timeOfDay";
import { fonts, tokens } from "@/lib/ui/tokens";

export default function Home() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { scene, sounds } = useSessionStore();
  const { name } = useDisplayName();
  const band = getTimeOfDay();

  const sceneShort = localize(getScene(scene).short, i18n.language);
  const primarySound = sounds[0];
  const withLine = primarySound
    ? t("home.withSound", {
        sound: localize(getSound(primarySound).label, i18n.language).toLowerCase(),
      })
    : null;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-8">
        {/* Layout: nav element first in JSX so flex-row puts it on the
            leading edge — LEFT in LTR English, RIGHT in RTL Hebrew (auto-
            flipped by I18nManager.forceRTL). Crisis takes the trailing edge. */}
        <View className="flex-row justify-between items-center pt-2">
          <Pressable hitSlop={16} onPress={() => router.push("/setup")}>
            <Icon name="menu" size={22} color={tokens.text} />
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
          }}
        >
          {name
            ? t(`home.greeting.${band}`, { name })
            : t(`home.greetingNoName.${band}`)}
        </Text>

        <View className="flex-1 justify-center">
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 13,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            {t("home.todaysMoment")}
          </Text>

          <Text
            style={{
              color: tokens.text,
              fontFamily: fonts.display,
              fontSize: 30,
              lineHeight: 40,
            }}
          >
            {sceneShort}
          </Text>

          {withLine ? (
            <Text
              style={{
                color: tokens.textMute,
                fontFamily: fonts.body,
                fontSize: 18,
                marginTop: 4,
              }}
            >
              {withLine}
            </Text>
          ) : null}

          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 15,
              marginTop: 16,
            }}
          >
            {t("home.durationHint")}
          </Text>
        </View>

        <View className="pb-2">
          <Pressable
            onPress={async () => {
              const seen = await getPsychoEducationSeen();
              if (seen) {
                router.push({ pathname: "/session", params: { scene } });
              } else {
                router.push({ pathname: "/psychoed", params: { scene } });
              }
            }}
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
          onPress={() => router.push("/calming")}
          hitSlop={8}
          style={{ alignSelf: "center", paddingTop: 8, paddingBottom: 4 }}
        >
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 14,
            }}
          >
            {t("home.needAMoment")}
          </Text>
        </Pressable>

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
    </SafeAreaView>
  );
}
