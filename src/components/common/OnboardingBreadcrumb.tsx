import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { FADE_DURATION_MS } from "@/lib/ui/fadeTransition";
import { OnboardingMacroStep, SCREENING_SUB_STEP_COUNT } from "@/lib/ui/onboardingSteps";
import { tokens } from "@/lib/ui/tokens";

type DotState = "active" | "completed" | "upcoming";

type Props = {
  step: OnboardingMacroStep;
  /** Only meaningful when step === "screening": which of the 3 internal
   *  sub-steps (intro/items/outcome) is current. */
  screeningSubStep?: 0 | 1 | 2;
};

/** Visual-only progress indicator for onboarding (Permissions → Screening →
 *  Psychoed). Never tappable — letting a tap jump backward into a
 *  mid-questionnaire state on a clinical instrument (PC-PTSD-5) is unsafe, so
 *  this only ever reflects state, never triggers navigation.
 *
 *  Dot vocabulary matches the existing SceneCarousel dots (18×6 active pill,
 *  6×6 otherwise) for visual consistency with shipped UI. Unlike
 *  SceneCarousel's Dots (which pins `direction:"ltr"` to track physical swipe
 *  gesture), this row uses plain `flexDirection:"row"` with no direction
 *  override: it has no gesture binding, so it's meant to mirror under RTL —
 *  the app forces native RTL for Hebrew and LTR for English (_layout.tsx),
 *  so progress runs right→left in Hebrew and left→right in English for free,
 *  entirely from Yoga's own mirroring. Dot *state* below is computed purely
 *  from step order and never branches on RTL. */
export function OnboardingBreadcrumb({ step, screeningSubStep }: Props) {
  const states = resolveStates(step, screeningSubStep);
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Dot state={states[0]} testID="breadcrumb-dot-permissions" />
      <View style={{ flexDirection: "row", paddingHorizontal: 2 }}>
        {Array.from({ length: SCREENING_SUB_STEP_COUNT }, (_, i) => (
          <Dot key={i} state={states[1 + i]} sub testID={`breadcrumb-dot-screening-${i}`} />
        ))}
      </View>
      <Dot state={states[1 + SCREENING_SUB_STEP_COUNT]} testID="breadcrumb-dot-psychoed" />
    </View>
  );
}

function resolveStates(
  step: OnboardingMacroStep,
  screeningSubStep: 0 | 1 | 2 | undefined,
): DotState[] {
  const permissions: DotState = step === "permissions" ? "active" : "completed";

  const screening: DotState[] = Array.from({ length: SCREENING_SUB_STEP_COUNT }, (_, i) => {
    if (step === "permissions") return "upcoming";
    if (step === "psychoed") return "completed";
    // step === "screening"
    const sub = screeningSubStep ?? 0;
    if (i < sub) return "completed";
    if (i === sub) return "active";
    return "upcoming";
  });

  const psychoed: DotState = step === "psychoed" ? "active" : "upcoming";

  return [permissions, ...screening, psychoed];
}

const WIDTH_UPCOMING = 6;
const WIDTH_ACTIVE = 18;

function Dot({
  state,
  sub,
  testID,
}: {
  state: DotState;
  sub?: boolean;
  testID?: string;
}) {
  const progress = useSharedValue(state === "active" ? 1 : 0);
  const filled = useSharedValue(state === "upcoming" ? 0 : 1);

  useEffect(() => {
    progress.value = withTiming(state === "active" ? 1 : 0, { duration: FADE_DURATION_MS });
    filled.value = withTiming(state === "upcoming" ? 0 : 1, { duration: FADE_DURATION_MS });
    // progress/filled are Reanimated shared values (stable identity) — listing
    // them here trips react-hooks/immutability instead, which is worse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: WIDTH_UPCOMING + (WIDTH_ACTIVE - WIDTH_UPCOMING) * progress.value,
    backgroundColor: interpolateColor(filled.value, [0, 1], [tokens.textMute, tokens.accent]),
    opacity: 0.4 + 0.6 * filled.value,
  }));

  return (
    <Animated.View
      testID={testID}
      style={[
        {
          height: 6,
          borderRadius: 3,
          marginHorizontal: sub ? 3 : 4,
        },
        animatedStyle,
      ]}
    />
  );
}
