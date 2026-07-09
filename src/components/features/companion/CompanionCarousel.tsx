import { useRef, useState } from "react";
import {
  Dimensions,
  GestureResponderEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Carousel from "react-native-reanimated-carousel";
import { useTranslation } from "react-i18next";

import { localize, Scene, SceneKey } from "@/lib/content/content";
import { fonts, tokens } from "@/lib/ui/tokens";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
// A tall, near-full-width page — one scenario fills the view; neighbors peek via
// the parallax config (same technique as setup/SceneCarousel.tsx).
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.84, 380);
const CARD_HEIGHT = Math.min(Math.round(CARD_WIDTH * 1.4), Math.round(SCREEN_HEIGHT * 0.6));

export type SceneProgress = { done: number; total: number };

type Props = {
  scenes: Scene[];
  progress: Record<string, SceneProgress>;
  lang: string;
  onOpen: (key: SceneKey) => void;
};

/** Companion home — a full-page carousel of scenarios. Swipe between scenes;
 *  tapping a page opens that scene's step roadmap. Each page shows the scene's
 *  photo, label, and how many steps the user has completed. */
export function CompanionCarousel({ scenes, progress, lang, onOpen }: Props) {
  const [activeKey, setActiveKey] = useState<SceneKey | undefined>(scenes[0]?.key);

  return (
    <View>
      <Carousel
        width={SCREEN_WIDTH}
        height={CARD_HEIGHT + 16}
        data={scenes}
        loop={scenes.length > 1}
        onSnapToItem={(index) => setActiveKey(scenes[index]?.key)}
        style={{ width: SCREEN_WIDTH, alignSelf: "center" }}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 0.9,
          parallaxScrollingOffset: SCREEN_WIDTH - CARD_WIDTH - 24,
        }}
        renderItem={({ item }) => (
          <ScenePage
            scene={item}
            lang={lang}
            progress={progress[item.key]}
            onOpen={() => onOpen(item.key)}
          />
        )}
      />
      <Dots scenes={scenes} activeKey={activeKey} />
    </View>
  );
}

function ScenePage({
  scene,
  lang,
  progress,
  onOpen,
}: {
  scene: Scene;
  lang: string;
  progress?: SceneProgress;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const source =
    typeof scene.media.still === "string" ? { uri: scene.media.still } : scene.media.still;
  const done = progress?.done ?? 0;
  const total = progress?.total ?? 0;
  const pct = total > 0 ? (done / total) * 100 : 0;

  // Tap-vs-swipe: the card lives inside a horizontally-panning carousel, so a
  // plain Pressable fired onPress at the end of a swipe ("too sensitive"). We
  // instead record the touch's start point and only treat the release as a tap
  // (→ open) when the finger barely moved; any real drag is a swipe and is
  // ignored, leaving the carousel to slide.
  const TAP_SLOP = 12;
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: GestureResponderEvent) => {
    start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  };
  const onTouchEnd = (e: GestureResponderEvent) => {
    const from = start.current;
    start.current = null;
    if (!from) return;
    const moved =
      Math.abs(e.nativeEvent.pageX - from.x) > TAP_SLOP ||
      Math.abs(e.nativeEvent.pageY - from.y) > TAP_SLOP;
    if (!moved) onOpen();
  };

  return (
    <View
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      accessibilityRole="button"
      accessibilityLabel={localize(scene.label, lang)}
      onAccessibilityTap={onOpen}
      testID={`companion-scenario-${scene.key}`}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        alignSelf: "center",
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: scene.tint.top,
      }}
    >
      {source ? (
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      ) : null}
      <LinearGradient
        colors={["rgba(20,15,12,0)", "rgba(20,15,12,0.92)"]}
        locations={[0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ position: "absolute", left: 22, right: 22, bottom: 24 }}>
        <Text
          style={{
            color: tokens.sceneText,
            fontFamily: fonts.display,
            fontSize: 30,
            lineHeight: 36,
            textAlign: "left",
          }}
        >
          {localize(scene.label, lang)}
        </Text>
        <Text
          style={{
            color: tokens.sceneTextMute,
            fontFamily: fonts.body,
            fontSize: 14,
            marginTop: 6,
            textAlign: "left",
          }}
        >
          {t("companion.stepsCount", { count: total, done, total })}
        </Text>
        <View
          style={{
            marginTop: 10,
            height: 4,
            borderRadius: 2,
            backgroundColor: "rgba(244,238,227,0.25)",
            overflow: "hidden",
          }}
        >
          <View style={{ width: `${pct}%`, height: 4, backgroundColor: tokens.sage }} />
        </View>
        <View
          style={{
            marginTop: 16,
            alignSelf: "flex-start",
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 999,
            backgroundColor: tokens.sceneText,
          }}
        >
          <Text style={{ color: tokens.bg, fontFamily: fonts.bodyMedium, fontSize: 14 }}>
            {t("companion.open")}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Dots({ scenes, activeKey }: { scenes: Scene[]; activeKey?: SceneKey }) {
  const activeIndex = scenes.findIndex((s) => s.key === activeKey);
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 16 }}>
      {scenes.map((scene, i) => {
        const active = i === activeIndex;
        return (
          <View
            key={scene.key}
            style={{
              width: active ? 18 : 6,
              height: 6,
              borderRadius: 3,
              marginHorizontal: 4,
              backgroundColor: active ? tokens.accent : tokens.textMute,
              opacity: active ? 1 : 0.4,
            }}
          />
        );
      })}
    </View>
  );
}
