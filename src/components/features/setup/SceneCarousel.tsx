import { Dimensions, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Carousel from "react-native-reanimated-carousel";

import {
  getScenes,
  localize,
  Scene,
  SceneKey,
  SCENES_WITH_BAKED_CAPTION,
} from "@/lib/content/content";
import { fonts, tokens } from "@/lib/ui/tokens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// v1.1.6: widened from 0.74 → 0.86 (and cap 320 → 380) after tester feedback
// that the scene illustration felt cropped to the middle. Pushes more of the
// art into view while still leaving a small parallax peek on neighboring
// cards (offset math below accounts for the new width).
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.86, 380);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.78);

const SCENES = getScenes();

type Props = {
  value: SceneKey;
  onChange: (key: SceneKey) => void;
  lang: string;
};

export function SceneCarousel({ value, onChange, lang }: Props) {
  const initialIndex = Math.max(
    0,
    SCENES.findIndex((s) => s.key === value),
  );

  return (
    <View>
      <Carousel
        // Item width matches the viewport. The visual "peek" of neighboring
        // cards comes from the parallax modeConfig below, not from sizing.
        // Carousel viewport = full screen, so the snapped item is dead-center.
        width={SCREEN_WIDTH}
        height={CARD_HEIGHT + 16}
        data={SCENES}
        // #3: infinite loop — swiping past the last scene wraps to the first
        // (and vice versa). react-native-reanimated-carousel handles the
        // wrap natively; just opting in.
        loop={true}
        defaultIndex={initialIndex}
        onSnapToItem={(index) => onChange(SCENES[index].key)}
        style={{ width: SCREEN_WIDTH, alignSelf: "center" }}
        // #4: parallax mode scales adjacent items down and offsets them so
        // the active card reads as the focal point, with neighbors visibly
        // peeking on both sides. Fixes the "not well centered" feel from
        // the previous straight-snap layout.
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 0.86,
          parallaxScrollingOffset: SCREEN_WIDTH - CARD_WIDTH - 28,
        }}
        renderItem={({ item }) => <SceneCard scene={item} lang={lang} />}
      />
      <Dots count={SCENES.length} currentKey={value} />
    </View>
  );
}

function SceneCard({ scene, lang }: { scene: Scene; lang: string }) {
  const source =
    typeof scene.media.still === "string"
      ? { uri: scene.media.still }
      : scene.media.still;

  return (
    <View
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        alignSelf: "center",
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: scene.tint.top,
      }}
    >
      {source ? (
        <Image
          source={source}
          // TEMP(roy): captioned stills are drawn oversized + top-anchored so the
          // card's overflow:hidden crops the bottom ~15% (the baked English title).
          style={
            SCENES_WITH_BAKED_CAPTION.has(scene.key)
              ? { position: "absolute", top: 0, left: 0, right: 0, height: CARD_HEIGHT / 0.85 }
              : { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }
          }
          contentFit="cover"
          contentPosition="top"
          transition={400}
        />
      ) : null}
      <LinearGradient
        colors={["rgba(20,15,12,0)", "rgba(20,15,12,0.9)"]}
        locations={[0.45, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{ position: "absolute", bottom: 18, left: 18, right: 18 }}>
        <Text
          style={{
            color: tokens.sceneText,
            fontFamily: fonts.display,
            fontSize: 22,
            lineHeight: 28,
            textAlign: "left",
          }}
        >
          {localize(scene.label, lang)}
        </Text>
      </View>
    </View>
  );
}

function Dots({ count, currentKey }: { count: number; currentKey: SceneKey }) {
  const currentIndex = SCENES.findIndex((s) => s.key === currentKey);
  return (
    <View
      style={{
        // LTR keeps dot order matching the RTL-agnostic carousel's index order,
        // so the active dot tracks the swipe instead of moving opposite it.
        direction: "ltr",
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 14,
      }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const active = i === currentIndex;
        return (
          <View
            key={i}
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
