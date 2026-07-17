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
 *  one place that decides what "forward" looks like.
 *
 *  RTL note: `flexDirection: "row"` genuinely auto-reverses under
 *  I18nManager RTL (confirmed on-device — the first JSX child lands
 *  physically right), so a fixed [label, icon] order alone mirrors
 *  correctly in both directions with no isRTL branch needed. Screen
 *  position, on the other hand, uses marginLeft/marginRight: "auto" —
 *  true physical properties RN never mirrors — since that's the one lever
 *  immune to RTL auto-reversal ambiguity. */
export function ForwardCta({ label, onPress, disabled, accessibilityHint, testID }: Props) {
  const isRTL = I18nManager.isRTL;

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
        marginRight: isRTL ? "auto" : undefined,
        marginLeft: isRTL ? undefined : "auto",
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
