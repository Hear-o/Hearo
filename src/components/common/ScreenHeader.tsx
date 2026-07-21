import { View } from "react-native";

import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";

type Props = {
  /** Leading-edge control; omit for screens with no left-side nav. */
  left?: React.ReactNode;
  /** Forwarded to CrisisAffordance. */
  tone?: "on-bg" | "on-scene";
  /** Horizontal inset; defaults to 32 (px-8). */
  paddingX?: number;
  /** Optional second row below the left/crisis row — e.g. the onboarding
   *  breadcrumb. Additive: omitted by every screen except onboarding, so it
   *  changes nothing for existing call sites. */
  bottom?: React.ReactNode;
};

/** Owns the crisis "i" position so it can't drift between screens. */
export function ScreenHeader({ left, tone = "on-bg", paddingX = 32, bottom }: Props) {
  return (
    <View style={{ paddingTop: 8, paddingHorizontal: paddingX }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>{left}</View>
        <CrisisAffordance tone={tone} />
      </View>
      {bottom ? <View style={{ marginTop: 10 }}>{bottom}</View> : null}
    </View>
  );
}
