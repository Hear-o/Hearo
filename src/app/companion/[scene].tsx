import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
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
  CompanionTaskMedia,
  getCompanionTaskMedia,
} from "@/lib/storage/storage";
import { deleteCompanionMedia, pickCompanionMedia } from "@/lib/companion/media";
import { companionDoneCount, computeStepStates } from "@/lib/companion/steps";
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
 *  path to follow.
 *
 *  v1.2.0 media gating: a step is completed by attaching a photo or video
 *  (camera or library) — proof you took the step in real life. That upload is
 *  what unlocks the next step; a step stays locked until the one before it has
 *  media. Media lives only on the device (see lib/companion/media.ts). */
export default function CompanionRoadmap() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { scene: sceneParam } = useLocalSearchParams<{ scene?: string }>();
  const scene: SceneKey = VALID_SCENES.includes(sceneParam as SceneKey)
    ? (sceneParam as SceneKey)
    : "park";

  const sceneRecord = getScene(scene);
  const tasks = getCompanionTasks(scene);
  const [media, setMedia] = useState<Record<string, CompanionTaskMedia>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Reload media on focus so returning from the viewer (or another screen)
  // reflects the latest uploads and unlock state.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getCompanionTaskMedia().then((m) => {
        if (active) setMedia(m);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const stepStates = computeStepStates(tasks, media);
  const doneCount = companionDoneCount(tasks, media);

  const addMedia = async (task: CompanionTask) => {
    if (busyKey) return; // guard against a double-tap launching two pickers
    setBusyKey(task.key);
    try {
      const result = await pickCompanionMedia(task.key);
      if (result) setMedia((prev) => ({ ...prev, [task.key]: result }));
    } finally {
      setBusyKey(null);
    }
  };

  const removeMedia = (task: CompanionTask) => {
    Alert.alert(t("companion.removeMediaTitle"), t("companion.removeMediaMessage"), [
      { text: t("companion.cancel"), style: "cancel" },
      {
        text: t("companion.removeMedia"),
        style: "destructive",
        onPress: () => {
          void deleteCompanionMedia(task.key).then(() => {
            setMedia((prev) => {
              const next = { ...prev };
              delete next[task.key];
              return next;
            });
          });
        },
      },
    ]);
  };

  const viewMedia = (task: CompanionTask) => {
    router.push({
      pathname: "/companion/media" as any,
      params: { task: task.key },
    });
  };

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
          {stepStates.map(({ task, media: taskMedia, unlocked }, i) => (
            <RoadmapNode
              key={task.key}
              index={i}
              total={stepStates.length}
              label={localize(task.label, i18n.language)}
              media={taskMedia}
              unlocked={unlocked}
              busy={busyKey === task.key}
              onAdd={() => void addMedia(task)}
              onView={() => viewMedia(task)}
              onRemove={() => removeMedia(task)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** One node on the roadmap. Zig-zag horizontal position by index; renders one
 *  of three states — locked (previous step has no media), unlocked-empty (an
 *  "add" affordance), or done (thumbnail + replace/remove). */
function RoadmapNode({
  index,
  total,
  label,
  media,
  unlocked,
  busy,
  onAdd,
  onView,
  onRemove,
}: {
  index: number;
  total: number;
  label: string;
  media?: CompanionTaskMedia;
  unlocked: boolean;
  busy: boolean;
  onAdd: () => void;
  onView: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const isRight = index % 2 === 1;
  const alignSelf = isRight ? "flex-end" : "flex-start";
  const showConnector = index < total - 1;
  const done = !!media;

  return (
    <View style={{ alignItems: "stretch", marginBottom: 8 }}>
      <View
        accessibilityState={{ disabled: !unlocked && !done }}
        style={{
          alignSelf,
          maxWidth: "84%",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: done
            ? tokens.sage
            : unlocked
              ? tokens.textMute + "44"
              : tokens.textMute + "22",
          backgroundColor: done ? tokens.sage + "22" : tokens.bgElev,
          opacity: unlocked || done ? 1 : 0.5,
          paddingVertical: 14,
          paddingHorizontal: 18,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <NodeCheck done={done} />
          <Text
            style={{
              color: tokens.text,
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
        </View>

        {done ? (
          <MediaRow media={media} onView={onView} onRemove={onRemove} onReplace={onAdd} />
        ) : unlocked ? (
          <Pressable
            onPress={onAdd}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t("companion.addMedia")}
            style={{
              marginTop: 12,
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: tokens.accent,
              backgroundColor: tokens.accent + "12",
              opacity: busy ? 0.5 : 1,
            }}
          >
            <Text style={{ color: tokens.accent, fontSize: 16, lineHeight: 18 }}>＋</Text>
            <Text
              style={{
                color: tokens.accent,
                fontFamily: fonts.bodyMedium,
                fontSize: 13,
                textAlign: "left",
              }}
            >
              {t("companion.addMedia")}
            </Text>
          </Pressable>
        ) : (
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 12,
              marginTop: 8,
              textAlign: "left",
            }}
          >
            {t("companion.locked")}
          </Text>
        )}
      </View>

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

function MediaRow({
  media,
  onView,
  onReplace,
  onRemove,
}: {
  media: CompanionTaskMedia;
  onView: () => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable
        onPress={onView}
        accessibilityRole="button"
        accessibilityLabel={t("companion.open")}
        testID="companion-media-thumb"
      >
        <Thumbnail media={media} />
      </Pressable>
      <View style={{ flex: 1 }} />
      <Pressable onPress={onReplace} hitSlop={8} accessibilityRole="button">
        <Text style={{ color: tokens.accent, fontFamily: fonts.bodyMedium, fontSize: 13 }}>
          {t("companion.replaceMedia")}
        </Text>
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button">
        <Text style={{ color: tokens.critical, fontFamily: fonts.bodyMedium, fontSize: 13 }}>
          {t("companion.removeMedia")}
        </Text>
      </Pressable>
    </View>
  );
}

function Thumbnail({ media }: { media: CompanionTaskMedia }) {
  const { t } = useTranslation();
  const SIZE = 56;
  if (media.type === "video") {
    return (
      <View
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: 10,
          backgroundColor: tokens.text + "22",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: tokens.text, fontSize: 16, lineHeight: 18 }}>▶</Text>
        <Text style={{ color: tokens.textMute, fontSize: 9, marginTop: 2 }}>
          {t("companion.videoLabel")}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: media.uri }}
      style={{ width: SIZE, height: SIZE, borderRadius: 10 }}
      contentFit="cover"
      transition={150}
    />
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
