import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { CalmingBoxBreathingStep, localize } from "@/lib/content/content";
import { fonts, tokens } from "@/lib/ui/tokens";

type Phase = "inhale" | "hold1" | "exhale" | "hold2";
const PHASE_ORDER: Phase[] = ["inhale", "hold1", "exhale", "hold2"];

type Props = {
  step: CalmingBoxBreathingStep;
  onComplete: () => void;
};

/** Box-breathing: 4-phase cycle (inhale 4s / hold 4s / exhale 4s / hold 4s)
 *  repeated `cycles` times. Visual: a circle that grows during inhale, holds
 *  full size, shrinks during exhale, holds at minimum. The prompt under the
 *  circle is driven from the same timer that drives the scale animation —
 *  setState advances the phase index every `phaseMs`.
 *
 *  Test seam: phases advance via setTimeout, which Jest fake-timers control.
 *  When the last phase of the last cycle finishes, `onComplete` fires. */
export function BoxBreathingTimer({ step, onComplete }: Props) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const scale = useSharedValue(0.5);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycleIndex, setCycleIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function tick(p: number, c: number) {
      const phase = PHASE_ORDER[p];
      if (phase === "inhale") {
        scale.value = withTiming(1, { duration: step.phaseMs, easing: Easing.inOut(Easing.quad) });
      } else if (phase === "exhale") {
        scale.value = withTiming(0.5, { duration: step.phaseMs, easing: Easing.inOut(Easing.quad) });
      }
      // hold1 / hold2: don't touch scale.

      timer = setTimeout(() => {
        const nextP = p + 1;
        if (nextP < PHASE_ORDER.length) {
          setPhaseIndex(nextP);
          tick(nextP, c);
        } else {
          const nextC = c + 1;
          if (nextC < step.cycles) {
            setCycleIndex(nextC);
            setPhaseIndex(0);
            tick(0, nextC);
          } else {
            onCompleteRef.current();
          }
        }
      }, step.phaseMs);
    }

    tick(0, 0);

    return () => {
      if (timer) clearTimeout(timer);
      cancelAnimation(scale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const phase = PHASE_ORDER[phaseIndex];
  const promptText =
    phase === "inhale"
      ? localize(step.prompts.inhale, lang)
      : phase === "exhale"
        ? localize(step.prompts.exhale, lang)
        : localize(step.prompts.hold, lang);

  return (
    <Animated.View
      className="items-center justify-center"
      style={{ alignSelf: "center", paddingVertical: 24 }}
    >
      <Animated.View
        style={[
          {
            width: 200,
            height: 200,
            borderRadius: 100,
            borderWidth: 2,
            borderColor: tokens.accent,
          },
          circleStyle,
        ]}
      />
      <Text
        accessibilityLiveRegion="polite"
        style={{
          color: tokens.text,
          fontFamily: fonts.display,
          fontSize: 20,
          marginTop: 28,
        }}
      >
        {promptText}
      </Text>
      <Text
        style={{
          color: tokens.textMute,
          fontFamily: fonts.body,
          fontSize: 13,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          marginTop: 8,
        }}
      >
        {cycleIndex + 1} / {step.cycles}
      </Text>
    </Animated.View>
  );
}
