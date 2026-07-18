import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/components/common/ScreenHeader";
import { getPsychoEducation, localize, SceneKey } from "@/lib/content/content";
import { setPsychoEducationSeen } from "@/lib/storage/storage";
import { fonts, tokens } from "@/lib/ui/tokens";

export default function PsychoEducation() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const params = useLocalSearchParams<{ scene?: string; from?: string }>();

  const content = getPsychoEducation();
  const lang = i18n.language;

  // Three entry contexts:
  //  - scene param present → the Home Begin flow; continue into /preparing.
  //  - from=onboarding → shown once after screening; land on /home so the user
  //    chooses Practice vs Companion.
  //  - neither → re-read from /setup; go back when done.
  const sceneParam = params.scene as SceneKey | undefined;
  const fromOnboarding = params.from === "onboarding";

  async function handleContinue() {
    await setPsychoEducationSeen(true);
    if (sceneParam) {
      // /preparing now pre-loads the audio engine; /session lands ready.
      router.replace({ pathname: "/preparing", params: { scene: sceneParam } });
    } else if (fromOnboarding) {
      router.replace("/home");
    } else {
      router.back();
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-8">
        <ScreenHeader paddingX={0} />

        <ScrollView
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 8 }}
          showsVerticalScrollIndicator={true}
        >
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 13,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              marginBottom: 14,
              textAlign: "left",
            }}
          >
            {localize(content.eyebrow, lang)}
          </Text>

          <Text
            style={{
              color: tokens.text,
              fontFamily: fonts.display,
              fontSize: 30,
              lineHeight: 40,
              marginBottom: 28,
              textAlign: "left",
            }}
          >
            {localize(content.heading, lang)}
          </Text>

          {content.body.map((paragraph, i) => (
            <Text
              key={i}
              style={{
                color: tokens.textMute,
                fontFamily: fonts.body,
                fontSize: 16,
                lineHeight: 26,
                marginBottom: 18,
                textAlign: "left",
              }}
            >
              {localize(paragraph, lang)}
            </Text>
          ))}
        </ScrollView>

        <View className="pb-2">
          <Pressable
            onPress={handleContinue}
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
              accessibilityRole="button"
              style={{
                color: tokens.accent,
                fontFamily: fonts.body,
                fontSize: 18,
              }}
            >
              {localize(content.continueLabel, lang)}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
