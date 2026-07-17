import { View } from "react-native";

type Props = {
  children: React.ReactNode;
};

/** The one place that decides where a fixed "forward" footer sits — same
 *  horizontal gutter and bottom offset everywhere it's used, so Welcome's
 *  Begin and Permissions' Continue land at the exact same screen position
 *  instead of two files independently guessing the same numbers. */
export function ForwardCtaFooter({ children }: Props) {
  return (
    <View style={{ paddingHorizontal: 32, paddingBottom: 48 }}>{children}</View>
  );
}
