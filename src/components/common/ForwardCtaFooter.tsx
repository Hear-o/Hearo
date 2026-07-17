import { View } from "react-native";

type Props = {
  children: React.ReactNode;
  /** Horizontal inset. Screens default to `px-8` (32); pass 0 when the
   *  parent already applies its own gutter (e.g. Welcome's outer px-8) so
   *  the two don't stack — same convention as ScreenHeader's paddingX. */
  paddingX?: number;
};

/** The one place that decides where a fixed "forward" footer sits — same
 *  horizontal gutter and bottom offset everywhere it's used, so Welcome's
 *  Begin and Permissions' Continue land at the exact same screen position
 *  instead of two files independently guessing the same numbers. */
export function ForwardCtaFooter({ children, paddingX = 32 }: Props) {
  return (
    <View style={{ paddingHorizontal: paddingX, paddingBottom: 48 }}>{children}</View>
  );
}
