import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/components/common/ScreenHeader";
import { ForwardCta } from "@/components/common/ForwardCta";
import { ForwardCtaFooter } from "@/components/common/ForwardCtaFooter";
import {
  getClinicalScreeningResult,
  getOnboardedAt,
} from "@/lib/storage/storage";

export default function Welcome() {
  const router = useRouter();
  const { t } = useTranslation();
  const handleBegin = () => router.push("/permissions");

  // v1.1.0: if onboarding is already complete, skip straight to /home on
  // launch. Two signals count as "onboarded":
  // - onboardedAt: explicit timestamp set in /home for v1.1.0+ users
  // - clinicalScreeningResult: pre-v1.1.0 users who completed the screening
  //   step never got onboardedAt set; this back-compat check spares them a
  //   forced re-onboarding on update.
  // While the storage read is in flight we render an empty bg-bg panel to
  // avoid a flash of welcome copy for returning users.
  const [readyToRender, setReadyToRender] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const [onboardedAt, priorScreening] = await Promise.all([
        getOnboardedAt(),
        getClinicalScreeningResult(),
      ]);
      if (!active) return;
      const isReturningUser = onboardedAt !== null || priorScreening !== undefined;
      if (isReturningUser) {
        router.replace("/home");
      } else {
        setReadyToRender(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (!readyToRender) {
    return <View className="flex-1 bg-bg" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-8 justify-between">
        <ScreenHeader paddingX={0} />
        <View className="absolute left-8 top-24">
          <View className="w-8 h-px bg-accent" />
        </View>

        <View className="flex-1 justify-center">
          <Text
            className="text-text font-display text-4xl leading-[44px]"
            style={{ fontFamily: "FrankRuhlLibre_400Regular", textAlign: "left" }}
          >
            {t("welcome.line")}
          </Text>
        </View>

        <ForwardCtaFooter paddingX={0}>
          <ForwardCta label={t("welcome.begin")} onPress={handleBegin} />
        </ForwardCtaFooter>
      </View>
    </SafeAreaView>
  );
}
