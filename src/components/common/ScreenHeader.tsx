import { View } from "react-native";

import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";

type Props = {
  /** Leading-edge control; omit for screens with no left-side nav. */
  left?: React.ReactNode;
  /** Forwarded to CrisisAffordance. */
  tone?: "on-bg" | "on-scene";
  /** Horizontal inset; defaults to 32 (px-8). */
  paddingX?: number;
};

/** Owns the crisis "i" position so it can't drift between screens. */
export function ScreenHeader({ left, tone = "on-bg", paddingX = 32 }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 8,
        paddingHorizontal: paddingX,
      }}
    >
      <View>{left}</View>
      <CrisisAffordance tone={tone} />
    </View>
  );
}
