import { Pressable, View } from "react-native";

import { Icon } from "@/components/common/Icon";
import { useCrisisStore } from "@/lib/storage/crisis-store";
import { tokens } from "@/lib/ui/tokens";

type Props = {
  /**
   * `on-bg` — sits over the flat `bg` color. Uses `textMute` for a quiet read.
   * `on-scene` — sits over a scene image. Slightly brighter to stay legible
   * through the overlay.
   */
  tone?: "on-bg" | "on-scene";
};

export function CrisisAffordance({ tone = "on-bg" }: Props) {
  const open = useCrisisStore((s) => s.open);
  const color = tone === "on-scene" ? tokens.sceneText : tokens.textMute;
  const opacity = tone === "on-scene" ? 0.8 : 0.85;

  return (
    <Pressable
      hitSlop={16}
      onPress={open}
      accessibilityLabel="open crisis support"
      accessibilityRole="button"
    >
      <View style={{ opacity }}>
        <Icon name="info" size={28} color={color} />
      </View>
    </Pressable>
  );
}
