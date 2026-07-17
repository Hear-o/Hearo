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

// alignSelf "flex-end" is writing-direction-relative: physical-right in LTR,
// mirrored to physical-left in RTL — one value, no isRTL branch.
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
      style={{
        opacity: disabled ? 0.4 : 1,
        alignSelf: "flex-end",
      }}
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
