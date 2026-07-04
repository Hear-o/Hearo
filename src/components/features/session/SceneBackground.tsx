import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";

import { getScene, SceneKey } from "@/lib/content/content";
import { tokens } from "@/lib/ui/tokens";

export type { SceneKey };

type Props = {
  scene: SceneKey;
  /** Strength of the dark overlay (0–1). Higher = imagery more muted. */
  intensity?: number;
};

export function SceneBackground({ scene, intensity = 0.78 }: Props) {
  const { media, tint } = getScene(scene);
  const overlayBottom = `rgba(20, 15, 12, ${Math.min(1, intensity + 0.08)})`;
  const overlayMiddle = `rgba(36, 27, 22, ${intensity})`;
  const overlayTop = `rgba(36, 27, 22, ${Math.min(1, intensity + 0.04)})`;

  // TODO(asset): when media.video is present, render it (expo-video VideoView,
  // muted + looping) instead of the still. Until video assets land we always
  // fall back to the still, and the tint gradient guarantees the right mood
  // even if the still fails to load.
  const stillSource =
    typeof media.still === "string" ? { uri: media.still } : media.still;

  return (
    <View style={StyleSheetAbsolute}>
      <LinearGradient colors={[tint.top, tokens.sceneOverlayBottom]} style={StyleSheetAbsolute} />
      {stillSource ? (
        <Image
          source={stillSource}
          style={StyleSheetAbsolute}
          contentFit="cover"
          transition={600}
        />
      ) : null}
      <LinearGradient
        colors={[overlayTop, overlayMiddle, overlayBottom]}
        locations={[0, 0.45, 1]}
        style={StyleSheetAbsolute}
      />
    </View>
  );
}

const StyleSheetAbsolute = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
