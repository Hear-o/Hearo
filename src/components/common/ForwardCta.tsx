import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon";
import { fonts, tokens } from "@/lib/ui/tokens";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

/** The single source of truth for the app's "move forward" affordance —
 *  welcome's Begin, permissions' Continue, setup's Ready. These used to be
 *  hand-rolled per screen and drifted in text size / lineHeight; this is the
 *  one place that decides what "forward" looks like. */
export function ForwardCta({ label, onPress, disabled, accessibilityHint, testID }: Props) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      hitSlop={8}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={{ alignSelf: "flex-end", opacity: disabled ? 0.4 : 1 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text
          style={{
            color: tokens.accent,
            fontFamily: fonts.body,
            fontSize: 24,
            lineHeight: 32,
          }}
        >
          {label}
        </Text>
        <Icon name="arrow-right" size={20} color={tokens.accent} />
      </View>
    </Pressable>
  );
}
