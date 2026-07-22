import { I18nManager, View } from "react-native";

import ArrowRightSvg from "@/assets/icons/arrow-right.svg";
import CloseSvg from "@/assets/icons/close.svg";
import LifebuoySvg from "@/assets/icons/lifebuoy.svg";
import MenuSvg from "@/assets/icons/menu.svg";
import SettingsSvg from "@/assets/icons/settings.svg";

// The user-facing icon names. `arrow-left` is rendered as the right-arrow SVG
// flipped horizontally — the Streamline free set has no clean thin left-arrow
// to match the right-arrow's stroke weight.
export type IconName =
  | "close"
  | "menu"
  | "lifebuoy"
  | "settings"
  | "arrow-right"
  | "arrow-left";

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

const COMPONENTS = {
  close: CloseSvg,
  menu: MenuSvg,
  lifebuoy: LifebuoySvg,
  settings: SettingsSvg,
  "arrow-right": ArrowRightSvg,
  "arrow-left": ArrowRightSvg,
} as const;

export function Icon({ name, size = 22, color = "currentColor" }: Props) {
  const Svg = COMPONENTS[name];

  // v1.1.8: arrows now flip in RTL. Callers name icons by *intent*
  // ("arrow-right" = forward, "arrow-left" = back) and we map intent to
  // visual direction here. In LTR, forward is the right-pointing SVG and
  // back gets a scaleX flip; in RTL, the roles swap so the visual arrow
  // still matches the user's expectation of "forward = where I'm going."
  // Without this, Hebrew users saw the back arrow on Setup pointing the
  // wrong way — Hili's UX review flagged it as a "feels disabled / wrong"
  // signal.
  const flip = (name === "arrow-left") !== I18nManager.isRTL;

  // Wrapper View carries the flip transform so the SVG itself can stay
  // as a single source file. RN's I18nManager does not auto-flip SVGs.
  return (
    <View
      style={
        flip
          ? { transform: [{ scaleX: -1 }], width: size, height: size }
          : { width: size, height: size }
      }
    >
      <Svg width={size} height={size} color={color} />
    </View>
  );
}
