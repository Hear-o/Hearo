import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";
import { Icon } from "@/components/common/Icon";
import {
  CompanionTask,
  getCompanionTasks,
  getScene,
  localize,
  SceneKey,
} from "@/lib/content/content";
import {
  getCompanionCompletedTasks,
  setCompanionTaskCompleted,
} from "@/lib/storage/storage";
import { fonts, tokens } from "@/lib/ui/tokens";

const VALID_SCENES: SceneKey[] = [
  "beach",
  "park",
  "cafe",
  "road",
  "train",
  "quiet-bar",
  "house-party",
  "supermarket",
  "bus",
];

/** Companion — per-scene roadmap of behavioral steps.
 *
 *  Duolingo-inspired zig-zag layout: nodes stack vertically down the page
 *  but alternate horizontally (right-left-right-left) to give the eye a
 *  path to follow. Each node is a task; tapping toggles completion.
 *
 *  v1 UX: simple done toggle. No detail page, no reflection form yet —
 *  the research recommendation was to optimize for the retention curve,
 *  not the feature list, and every extra step compounds against
 *  engagement. Reflection prompts can layer in once we see weekly retention. */
export default function CompanionRoadmap() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { scene: sceneParam } = useLocalSearchParams<{ scene?: string }>();
  const scene: SceneKey = VALID_SCENES.includes(sceneParam as SceneKey)
    ? (sceneParam as SceneKey)
    : "park";

  const sceneRecord = getScene(scene);
  const tasks = getCompanionTasks(scene);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  // Reload completion state on focus so returning from another screen
  // shows the latest checkmarks.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getCompanionCompletedTasks().then((keys) => {
        if (active) setCompleted(new Set(keys));
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const toggle = async (task: CompanionTask) => {
    const wasDone = completed.has(task.key);
    // Optimistic UI — snap the check on/off immediately.
    setCompleted((prev) => {
      const next = new Set(prev);
      if (wasDone) next.delete(task.key);
      else next.add(task.key);
      return next;
    });
    await setCompanionTaskCompleted(task.key, !wasDone);
  };

  const doneCount = tasks.filter((task) => completed.has(task.key)).length;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
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
            fontSize: 30,
            lineHeight: 38,
            marginTop: 20,
            paddingHorizontal: 32,
            textAlign: "left",
          }}
        >
          {localize(sceneRecord.label, i18n.language)}
        </Text>

        <Text
          style={{
            color: tokens.textMute,
            fontFamily: fonts.body,
            fontSize: 14,
            marginTop: 6,
            paddingHorizontal: 32,
            textAlign: "left",
          }}
        >
          {t("companion.progress", { done: doneCount, total: tasks.length })}
        </Text>

        <View style={{ marginTop: 28, paddingHorizontal: 24 }}>
          {tasks.map((task, i) => (
            <RoadmapNode
              key={task.key}
              index={i}
              total={tasks.length}
              label={localize(task.label, i18n.language)}
              done={completed.has(task.key)}
              onPress={() => void toggle(task)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** One node on the roadmap. Zig-zag horizontal position based on index —
 *  even indices to the leading edge, odd to trailing — plus a soft dotted
 *  connector line below to imply the path. */
function RoadmapNode({
  index,
  total,
  label,
  done,
  onPress,
}: {
  index: number;
  total: number;
  label: string;
  done: boolean;
  onPress: () => void;
}) {
  const isRight = index % 2 === 1;
  const alignSelf = isRight ? "flex-end" : "flex-start";
  const showConnector = index < total - 1;

  return (
    <View style={{ alignItems: "stretch", marginBottom: 8 }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: done }}
        accessibilityLabel={label}
        style={{
          alignSelf,
          maxWidth: "78%",
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingVertical: 14,
          paddingHorizontal: 18,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: done ? tokens.sage : tokens.textMute + "44",
          backgroundColor: done ? tokens.sage + "22" : tokens.bgElev,
        }}
      >
        <NodeCheck done={done} />
        <Text
          style={{
            color: done ? tokens.text : tokens.text,
            fontFamily: fonts.body,
            fontSize: 15,
            lineHeight: 22,
            flexShrink: 1,
            textAlign: "left",
            textDecorationLine: done ? "line-through" : "none",
            opacity: done ? 0.7 : 1,
          }}
        >
          {label}
        </Text>
      </Pressable>

      {showConnector ? (
        <View
          style={{
            width: 2,
            height: 24,
            backgroundColor: tokens.textMute + "44",
            alignSelf: "center",
            marginVertical: 4,
            borderRadius: 1,
          }}
        />
      ) : null}
    </View>
  );
}

function NodeCheck({ done }: { done: boolean }) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: done ? tokens.sage : tokens.textMute,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: done ? tokens.sage : "transparent",
      }}
    >
      {done ? (
        <Text style={{ color: tokens.bg, fontSize: 14, lineHeight: 14 }}>✓</Text>
      ) : null}
    </View>
  );
}
