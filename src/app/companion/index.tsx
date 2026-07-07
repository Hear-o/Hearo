import { Pressable, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";
import { Icon } from "@/components/common/Icon";
import { getCompanionScenes, localize, SceneKey } from "@/lib/content/content";
import { fonts, tokens } from "@/lib/ui/tokens";

/** Companion — v1 behavioral roadmap entry point.
 *
 *  Split off from home in v1.2.0. Lists each scenario with its background
 *  photo; tapping a scenario opens the per-scene roadmap of tasks the user
 *  can attempt in their day-to-day life.
 *
 *  Beta throughout — clinical review of task content is still pending
 *  (see content.ts COMPANION_TASKS TODO(clinical-review) markers). */
export default function CompanionIndex() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const scenes = getCompanionScenes();

  const openScene = (scene: SceneKey) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({ pathname: "/companion/[scene]" as any, params: { scene } });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-8 pt-4 flex-row justify-between items-center">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Icon name="arrow-left" size={22} color={tokens.text} />
          </Pressable>
          <CrisisAffordance />
        </View>

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
            marginBottom: 32,
            paddingHorizontal: 32,
            textAlign: "left",
          }}
        >
          {t("companion.header")}
        </Text>

        <View style={{ paddingHorizontal: 24, gap: 14 }}>
          {scenes.map((scene) => (
            <ScenarioCard
              key={scene.key}
              sceneKey={scene.key}
              label={localize(scene.label, i18n.language)}
              still={scene.media.still}
              onPress={() => openScene(scene.key)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScenarioCard({
  sceneKey,
  label,
  still,
  onPress,
}: {
  sceneKey: SceneKey;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  still: any;
  onPress: () => void;
}) {
  const source = typeof still === "string" ? { uri: still } : still;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        height: 140,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: tokens.bgElev,
      }}
      testID={`companion-scenario-${sceneKey}`}
    >
      {source ? (
        <Image
          source={source}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          transition={200}
        />
      ) : null}
      <LinearGradient
        colors={["rgba(20,15,12,0)", "rgba(20,15,12,0.85)"]}
        locations={[0.4, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{ position: "absolute", bottom: 16, left: 20, right: 20 }}>
        <Text
          style={{
            color: tokens.sceneText,
            fontFamily: fonts.display,
            fontSize: 24,
            lineHeight: 30,
            textAlign: "left",
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
