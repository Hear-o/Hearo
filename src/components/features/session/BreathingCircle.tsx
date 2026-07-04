import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { fonts, tokens } from "@/lib/ui/tokens";

type Props = {
  /** Pulse intensity for the trigger flash (0–1). */
  flash?: number;
  /** Slow the cycle (used when auto-soften kicks in). */
  slow?: boolean;
  /** Freeze the breathing animation (used when the crisis sheet opens). */
  paused?: boolean;
};

type Phase = "in" | "out";

export function BreathingCircle({ flash = 0, slow = false, paused = false }: Props) {
  const { t } = useTranslation();
  const scale = useSharedValue(0.6);
  const flashOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(1);
  const [phase, setPhase] = useState<Phase>("in");

  useEffect(() => {
    if (paused) {
      cancelAnimation(scale);
      return;
    }
    const inhale = slow ? 5000 : 4000;
    const exhale = slow ? 8000 : 6000;
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: inhale, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.6, { duration: exhale, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [scale, slow, paused]);

  // Drive the guidance text in lockstep with the scale animation.
  useEffect(() => {
    if (paused) return;
    const inhale = slow ? 5000 : 4000;
    const exhale = slow ? 8000 : 6000;

    setPhase("in");

    let timer: ReturnType<typeof setTimeout> | null = null;
    let next: Phase = "out";

    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        setPhase(next);
        next = next === "in" ? "out" : "in";
        schedule(next === "out" ? exhale : inhale);
      }, delay);
    };

    // First switch from "in" to "out" happens after the inhale duration.
    schedule(inhale);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [slow, paused]);

  // Brief crossfade on phase change so the text doesn't pop.
  useEffect(() => {
    textOpacity.value = withSequence(
      withTiming(0, { duration: 220 }),
      withTiming(1, { duration: 420 }),
    );
  }, [phase, textOpacity]);

  useEffect(() => {
    if (flash > 0) {
      flashOpacity.value = withSequence(
        withTiming(flash, { duration: 200 }),
        withTiming(0, { duration: 1200 }),
      );
    }
  }, [flash, flashOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const label = phase === "in" ? t("session.breatheIn") : t("session.breatheOut");

  return (
    <Animated.View
      className="w-44 h-44 items-center justify-center"
      style={{ alignSelf: "center" }}
    >
      <Animated.View
        style={[
          {
            width: 176,
            height: 176,
            borderRadius: 88,
            borderWidth: 1.5,
            borderColor: tokens.sceneTextMute,
            opacity: 0.55,
            position: "absolute",
          },
          ringStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            width: 176,
            height: 176,
            borderRadius: 88,
            borderWidth: 2,
            borderColor: tokens.sceneAccent,
            position: "absolute",
          },
          flashStyle,
        ]}
      />
      <Animated.View style={textStyle}>
        <Text
          style={{
            color: tokens.sceneText,
            fontFamily: fonts.display,
            fontSize: 18,
            opacity: 0.85,
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
