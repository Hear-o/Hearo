import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";
import { useSwipeForward } from "@/hooks/useSwipeForward";
import { fonts, tokens } from "@/lib/ui/tokens";

/** Post-session affirmation screen. Per the UI QA pass, the previous
 *  "you were here for six minutes" / "your pulse" / "how was that?"
 *  layout was replaced with a single affirmation that names the work
 *  the user just did — facing something hard and staying with it.
 *  Pulse + sparkline + reflection options are gone (handled in #13 /
 *  #14 of the QA pass).
 *
 *  The /after route is the natural end of every session pathway:
 *  natural completion, manual exit, calming protocol. We render the
 *  same affirmation regardless of which path ended the session — the
 *  user shouldn't feel labeled by the exit they took. */
export default function After() {
  const router = useRouter();
  const { t } = useTranslation();
  const handleDone = () => router.replace("/home");
  const swipeGesture = useSwipeForward(handleDone);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <GestureDetector gesture={swipeGesture}>
      <View className="flex-1 px-8">
        <View className="pt-2 flex-row justify-end">
          <CrisisAffordance />
        </View>

        <View className="pt-10">
          <View style={{ width: 28, height: 1, backgroundColor: tokens.accent }} />
        </View>

        <View className="flex-1 justify-center">
          <Text
            style={{
              color: tokens.text,
              fontFamily: fonts.display,
              fontSize: 36,
              lineHeight: 46,
              marginBottom: 24,
            }}
          >
            {t("after.affirmationTitle")}
          </Text>

          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 18,
              lineHeight: 28,
            }}
          >
            {t("after.affirmationBody")}
          </Text>
        </View>

        <Pressable
          onPress={handleDone}
          hitSlop={8}
          accessibilityRole="button"
          style={{
            borderWidth: 1,
            borderColor: tokens.accent,
            borderRadius: 999,
            paddingVertical: 16,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              color: tokens.accent,
              fontFamily: fonts.body,
              fontSize: 18,
            }}
          >
            {t("after.done")}
          </Text>
        </Pressable>
      </View>
      </GestureDetector>
    </SafeAreaView>
  );
}
