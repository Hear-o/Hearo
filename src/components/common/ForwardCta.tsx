import { I18nManager, Pressable, Text, View } from "react-native";

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
  const isRTL = I18nManager.isRTL;
  const labelStyle = {
    flex: 1,
    color: tokens.accent,
    fontFamily: fonts.body,
    fontSize: 24,
    lineHeight: 32,
    textAlign: isRTL ? ("left" as const) : ("right" as const),
  };
  const icon = <Icon name="arrow-right" size={20} color={tokens.accent} />;
  const text = <Text style={labelStyle}>{label}</Text>;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      hitSlop={8}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {isRTL ? (
          <>
            {icon}
            {text}
          </>
        ) : (
          <>
            {text}
            {icon}
          </>
        )}
      </View>
    </Pressable>
  );
}
