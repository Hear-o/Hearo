import { useRef } from "react";
import {
  AccessibilityActionEvent,
  GestureResponderEvent,
  Text,
  View,
} from "react-native";

import { fonts, tokens } from "@/lib/ui/tokens";

type Props = {
  label: string;
  value: number;
  values: readonly number[];
  displayValue: string;
  incrementLabel: string;
  decrementLabel: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  testID?: string;
};

/** A dependency-free stepped slider with touch and screen-reader controls. */
export function AccessibleSlider({
  label,
  value,
  values,
  displayValue,
  incrementLabel,
  decrementLabel,
  onChange,
  disabled = false,
  testID,
}: Props) {
  const widthRef = useRef(1);
  const selectedIndex = Math.max(
    0,
    values.reduce((closest, candidate, index) =>
      Math.abs(candidate - value) < Math.abs(values[closest] - value)
        ? index
        : closest,
    0),
  );
  const progress = values.length <= 1 ? 0 : selectedIndex / (values.length - 1);

  function updateFromTouch(event: GestureResponderEvent) {
    if (disabled || values.length === 0) return;
    const ratio = Math.min(
      1,
      Math.max(0, event.nativeEvent.locationX / widthRef.current),
    );
    const nextIndex = Math.round(ratio * (values.length - 1));
    onChange(values[nextIndex]);
  }

  function handleAccessibilityAction(event: AccessibilityActionEvent) {
    if (disabled) return;
    if (event.nativeEvent.actionName === "increment") {
      onChange(values[Math.min(values.length - 1, selectedIndex + 1)]);
    }
    if (event.nativeEvent.actionName === "decrement") {
      onChange(values[Math.max(0, selectedIndex - 1)]);
    }
  }

  return (
    <View style={{ opacity: disabled ? 0.45 : 1 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Text
          style={{
            color: tokens.text,
            fontFamily: fonts.bodyMedium,
            fontSize: 17,
            lineHeight: 24,
            textAlign: "left",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: tokens.accentSoft,
            fontFamily: fonts.bodyMedium,
            fontSize: 17,
            lineHeight: 24,
          }}
        >
          {displayValue}
        </Text>
      </View>

      <View
        testID={testID}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: displayValue }}
        accessibilityState={{ disabled }}
        accessibilityActions={[
          { name: "increment", label: incrementLabel },
          { name: "decrement", label: decrementLabel },
        ]}
        onAccessibilityAction={handleAccessibilityAction}
        onLayout={(event) => {
          widthRef.current = Math.max(1, event.nativeEvent.layout.width);
        }}
        onStartShouldSetResponder={() => !disabled}
        onMoveShouldSetResponder={() => !disabled}
        onResponderGrant={updateFromTouch}
        onResponderMove={updateFromTouch}
        style={{
          height: 48,
          justifyContent: "center",
          direction: "ltr",
        }}
      >
        <View
          pointerEvents="none"
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: tokens.textMute + "40",
          }}
        >
          <View
            style={{
              width: `${progress * 100}%`,
              height: 4,
              borderRadius: 2,
              backgroundColor: tokens.accent,
            }}
          />
          <View
            style={{
              position: "absolute",
              left: `${progress * 100}%`,
              top: -9,
              width: 22,
              height: 22,
              marginLeft: -11,
              borderRadius: 11,
              backgroundColor: tokens.bg,
              borderWidth: 2,
              borderColor: tokens.accent,
            }}
          />
        </View>
      </View>
    </View>
  );
}
