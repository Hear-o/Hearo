import { View } from "react-native";

import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";

type Props = {
  /** Leading-edge control (back arrow, settings gear). Omit for screens with
   *  no left-side nav — the crisis affordance still anchors trailing. */
  left?: React.ReactNode;
  /** Forwarded to CrisisAffordance. `on-scene` for the session screen, which
   *  sits over a scene image instead of the flat background. */
  tone?: "on-bg" | "on-scene";
  /** Horizontal inset. Screens default to `px-8` (32); pass the screen's own
   *  gutter (e.g. session's 28px) to keep the "i" on the same edge as the
   *  rest of that screen's content. */
  paddingX?: number;
};

/** The one place that decides where the crisis "i" sits. Every screen used to
 *  hand-roll its own header row with its own top padding and edge, which made
 *  the "i" visibly drift between screens — a problem for a safety-critical,
 *  one-tap-from-everywhere affordance. `pt-2` (8px) + trailing edge is fixed
 *  here so no screen can drift again. */
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
