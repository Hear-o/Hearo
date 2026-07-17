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
 *  one place that decides what "forward" looks like.
 *
 *  RTL positioning — the app forces native RTL for Hebrew (forceRTL=true
 *  in AppDelegate.swift via plugins/withRtl.js), with
 *  makeRTLFlipLeftAndRightStyles=false. Under that config Yoga mirrors
 *  cross-axis flex alignment (flex-start/flex-end) but leaves physical
 *  left/right/margin untouched. So `alignSelf: "flex-end"` is the single
 *  correct value in BOTH directions: LTR pins physical right (English
 *  forward CTA), RTL mirrors it to physical left (Hebrew forward CTA) —
 *  no isRTL branch. This is the same writing-direction-relative primitive
 *  permissions.tsx and companion/[scene].tsx already rely on.
 *
 *  alignSelf is load-bearing for a second reason: ForwardCtaFooter's
 *  wrapping View defaults to alignItems: "stretch", which would make this
 *  Pressable fill 100% width. flex-end overrides that stretch, shrinking
 *  the Pressable to its content so it can pin to an edge at all. (Earlier
 *  marginLeft/marginRight: "auto" attempts silently did nothing because
 *  stretch left no free space for an auto margin to consume.) */
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
