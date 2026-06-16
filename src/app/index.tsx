import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";

import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";
import { Icon } from "@/components/common/Icon";
import { useSwipeForward } from "@/hooks/useSwipeForward";
import { tokens } from "@/lib/ui/tokens";

export default function Welcome() {
  const router = useRouter();
  const { t } = useTranslation();
  const handleBegin = () => router.push("/permissions");
  const swipe = useSwipeForward(handleBegin);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <GestureDetector gesture={swipe}>
      <View className="flex-1 px-8 justify-between">
        <View className="pt-6 flex-row">
          <CrisisAffordance />
        </View>
        <View className="absolute left-8 top-24">
          <View className="w-8 h-px bg-accent" />
        </View>

        <View className="flex-1 justify-center">
          <Text
            className="text-text font-display text-4xl leading-[44px]"
            style={{ fontFamily: "FrankRuhlLibre_400Regular" }}
          >
            {t("welcome.line")}
          </Text>
        </View>

        <View className="pb-12">
          <Pressable onPress={handleBegin}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text
                className="text-accent text-2xl"
                style={{ fontFamily: "Heebo_400Regular" }}
              >
                {t("welcome.begin")}
              </Text>
              <Icon name="arrow-right" size={20} color={tokens.accent} />
            </View>
          </Pressable>
        </View>
      </View>
      </GestureDetector>
    </SafeAreaView>
  );
}
