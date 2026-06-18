import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector } from "react-native-gesture-handler";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";
import { useSwipeForward } from "@/hooks/useSwipeForward";
import { getPsychoEducation, localize, SceneKey } from "@/lib/content/content";
import { setPsychoEducationSeen } from "@/lib/storage/storage";
import { fonts, tokens } from "@/lib/ui/tokens";

export default function PsychoEducation() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const params = useLocalSearchParams<{ scene?: string }>();

  const content = getPsychoEducation();
  const lang = i18n.language;

  // The scene param is optional — present when reached from the Home Begin
  // flow (route to /session next), absent when re-read from /setup (route
  // back when done).
  const sceneParam = params.scene as SceneKey | undefined;

  async function handleContinue() {
    await setPsychoEducationSeen(true);
    if (sceneParam) {
      // /preparing now pre-loads the audio engine; /session lands ready.
      router.replace({ pathname: "/preparing", params: { scene: sceneParam } });
    } else {
      router.back();
    }
  }

  const swipeGesture = useSwipeForward(handleContinue);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <GestureDetector gesture={swipeGesture}>
      <View className="flex-1 px-8">
        <View className="flex-row justify-between items-center pt-2">
          <CrisisAffordance />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
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
            {localize(content.eyebrow, lang)}
          </Text>

          <Text
            style={{
              color: tokens.text,
              fontFamily: fonts.display,
              fontSize: 30,
              lineHeight: 40,
              marginBottom: 28,
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
      </GestureDetector>
    </SafeAreaView>
  );
}
