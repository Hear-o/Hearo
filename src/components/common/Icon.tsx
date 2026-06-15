import { View } from "react-native";

import ArrowRightSvg from "@/assets/icons/arrow-right.svg";
import CloseSvg from "@/assets/icons/close.svg";
import InfoSvg from "@/assets/icons/info.svg";
import MenuSvg from "@/assets/icons/menu.svg";

// The user-facing icon names. `arrow-left` is rendered as the right-arrow SVG
// flipped horizontally — the Streamline free set has no clean thin left-arrow
// to match the right-arrow's stroke weight.
export type IconName = "close" | "menu" | "info" | "arrow-right" | "arrow-left";

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

const COMPONENTS = {
  close: CloseSvg,
  menu: MenuSvg,
  info: InfoSvg,
  "arrow-right": ArrowRightSvg,
  "arrow-left": ArrowRightSvg,
} as const;

export function Icon({ name, size = 22, color = "currentColor" }: Props) {
  const Svg = COMPONENTS[name];
  const flip = name === "arrow-left";

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
