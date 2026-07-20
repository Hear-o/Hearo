import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { FadeScreen } from "@/components/common/FadeScreen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { Icon } from "@/components/common/Icon";
import {
  CompanionCarousel,
  SceneProgress,
} from "@/components/features/companion/CompanionCarousel";
import { companionDoneCount } from "@/lib/companion/steps";
import {
  getCompanionScenes,
  getCompanionTasks,
  SceneKey,
} from "@/lib/content/content";
import { getCompanionTaskMedia } from "@/lib/storage/storage";
import { fonts, tokens } from "@/lib/ui/tokens";

/** Companion — v1 behavioral roadmap entry point.
 *
 *  v1.2.0: a full-page carousel of scenarios (one photo per page). Swipe
 *  between scenes; tapping a page opens that scene's step roadmap. Each page
 *  shows how many steps the user has completed (derived from attached media).
 *
 *  Beta throughout — clinical review of task content is still pending
 *  (see content.ts COMPANION_TASKS TODO(clinical-review) markers). */
export default function CompanionIndex() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const scenes = useMemo(() => getCompanionScenes(), []);
  const [progress, setProgress] = useState<Record<string, SceneProgress>>({});

  // Recompute per-scene progress on focus so returning from a scene's roadmap
  // reflects newly-attached media.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getCompanionTaskMedia().then((media) => {
        if (!active) return;
        const next: Record<string, SceneProgress> = {};
        for (const scene of scenes) {
          const tasks = getCompanionTasks(scene.key);
          next[scene.key] = { done: companionDoneCount(tasks, media), total: tasks.length };
        }
        setProgress(next);
      });
      return () => {
        active = false;
      };
    }, [scenes]),
  );

  const openScene = (scene: SceneKey) => {
    router.push({
      pathname: "/companion/[scene]" as any,
      params: { scene },
    });
  };

  return (
    <FadeScreen>
    <SafeAreaView className="flex-1 bg-bg">
      <ScreenHeader
        left={
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Icon name="arrow-left" size={22} color={tokens.accent} />
          </Pressable>
        }
      />

      <View className="px-8 pt-6">
        <View style={{ width: 28, height: 1, backgroundColor: tokens.sage }} />
      </View>

      <Text
        style={{
          color: tokens.text,
          fontFamily: fonts.display,
          fontSize: 28,
          lineHeight: 36,
          marginTop: 20,
          paddingHorizontal: 32,
          textAlign: "left",
        }}
      >
        {t("companion.header")}
      </Text>

      <View style={{ flex: 1, justifyContent: "center" }}>
        <CompanionCarousel
          scenes={scenes}
          progress={progress}
          lang={i18n.language}
          onOpen={openScene}
        />
      </View>
    </SafeAreaView>
    </FadeScreen>
  );
}
