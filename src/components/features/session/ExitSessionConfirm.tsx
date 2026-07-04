import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { fonts, tokens } from "@/lib/ui/tokens";

type Props = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const FADE_MS = 200;
const SHEET_FADE_MS = 240;

/** Custom in-app confirm dialog for ending a session early. Replaces the
 *  native iOS Alert.alert call so the visual language matches the rest of
 *  the app — warm sand background, FrankRuhl display heading, Heebo body,
 *  destructive accent on the primary action, muted text on cancel. The
 *  parent (`/session`) renders this overlay and gates the actual
 *  router.replace on `onConfirm`. */
export function ExitSessionConfirm({ isOpen, onCancel, onConfirm }: Props) {
  const { t } = useTranslation();

  const backdropOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.92);

  useEffect(() => {
    if (isOpen) {
      backdropOpacity.value = withTiming(0.55, { duration: FADE_MS });
      cardOpacity.value = withTiming(1, {
        duration: SHEET_FADE_MS,
        easing: Easing.out(Easing.cubic),
      });
      cardScale.value = withTiming(1, {
        duration: SHEET_FADE_MS,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: FADE_MS });
      cardOpacity.value = withTiming(0, { duration: FADE_MS });
      cardScale.value = withTiming(0.92, { duration: FADE_MS });
    }
  }, [isOpen, backdropOpacity, cardOpacity, cardScale]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <View
      pointerEvents={isOpen ? "auto" : "none"}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1100,
        elevation: 1100,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#000",
          },
          backdropStyle,
        ]}
      >
        <Pressable
          onPress={onCancel}
          style={{ flex: 1 }}
          accessibilityLabel={t("session.exitConfirmCancel")}
        />
      </Animated.View>

      <Animated.View
        style={[
          {
            width: "82%",
            maxWidth: 360,
            backgroundColor: tokens.bg,
            borderRadius: 20,
            paddingHorizontal: 28,
            paddingTop: 28,
            paddingBottom: 16,
            // Soft shadow so the card lifts off the scene background. iOS only;
            // Android gets `elevation` for parity.
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
          },
          cardStyle,
        ]}
      >
        <Text
          style={{
            color: tokens.text,
            fontFamily: fonts.display,
            fontSize: 22,
            lineHeight: 30,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          {t("session.exitConfirmTitle")}
        </Text>

        {/* Stack the actions vertically — gives them larger tap targets and
            keeps the destructive choice visually separated below the safe
            "keep going" option. */}
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          hitSlop={6}
          style={{
            paddingVertical: 14,
            alignItems: "center",
            borderRadius: 999,
            borderWidth: 1,
            borderColor: tokens.accent,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              color: tokens.accent,
              fontFamily: fonts.bodyMedium,
              fontSize: 16,
            }}
          >
            {t("session.exitConfirmCancel")}
          </Text>
        </Pressable>

        <Pressable
          onPress={onConfirm}
          accessibilityRole="button"
          hitSlop={6}
          style={{
            paddingVertical: 14,
            alignItems: "center",
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: tokens.critical,
              fontFamily: fonts.body,
              fontSize: 15,
            }}
          >
            {t("session.exitConfirmYes")}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
