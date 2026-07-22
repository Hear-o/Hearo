import { useEffect, useRef, useState } from "react";
import { I18nManager, Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";

import { BoxBreathingTimer } from "./BoxBreathingTimer";
import { SensoryGroundingStep } from "./SensoryGroundingStep";
import { Icon } from "@/components/common/Icon";
import {
  CalmingProtocolStep,
  getCalmingProtocol,
  localize,
} from "@/lib/content/content";
import { fonts, tokens } from "@/lib/ui/tokens";

/** Horizontal pan distance that counts as a swipe-to-advance. Same
 *  threshold as the Home swipe-to-begin so the gesture feels consistent. */
const SWIPE_THRESHOLD_PX = 60;

type Props = {
  /** Called when the protocol's final step completes. */
  onProtocolEnd: () => void;
  /** Optional override — defaults to `getCalmingProtocol()`. Used in tests
   *  to inject a shorter sequence so test wall-clock stays bounded. */
  steps?: CalmingProtocolStep[];
};

/** Orchestrates the 5-step calming protocol. Each step renders to its own
 *  component (BoxBreathingTimer, SensoryGroundingStep) or to a plain text
 *  fade for the prose-only steps (validation/body/close). When the current
 *  step's onComplete fires (timer OR swipe), advance to the next; when
 *  there's no next, call `onProtocolEnd`. */
export function CalmingProtocol({ onProtocolEnd, steps }: Props) {
  const protocol = steps ?? getCalmingProtocol();
  const [index, setIndex] = useState(0);
  const completedRef = useRef(false);

  function advance() {
    if (index + 1 < protocol.length) {
      setIndex(index + 1);
    } else if (!completedRef.current) {
      completedRef.current = true;
      onProtocolEnd();
    }
  }

  function goBack() {
    if (index > 0) setIndex(index - 1);
  }

  // Swipe: a horizontal pan past SWIPE_THRESHOLD_PX moves a step, same effect
  // as pressing the matching arrow. Direction is resolved by *intent*, not by
  // raw sign: in LTR a leftward drag means "forward", in RTL it means "back",
  // so the gesture matches the reading direction the arrows are laid out in.
  const swipeGesture = Gesture.Pan()
    .minDistance(SWIPE_THRESHOLD_PX)
    .onEnd((event) => {
      if (Math.abs(event.translationX) < SWIPE_THRESHOLD_PX) return;
      const draggedTowardStart = I18nManager.isRTL
        ? event.translationX > 0
        : event.translationX < 0;
      if (draggedTowardStart) {
        advance();
      } else {
        goBack();
      }
    })
    .runOnJS(true);

  const step = protocol[index];
  if (!step) return null;

  return (
    <GestureDetector gesture={swipeGesture}>
      <View className="flex-1">
        <StepNav
          total={protocol.length}
          index={index}
          onBack={goBack}
          onForward={advance}
        />
        <View className="flex-1 px-8 pb-8">
          {/* `key` forces unmount + remount when the step changes — without
              it, two consecutive prose steps with identical `durationMs`
              would reuse the same React instance and not reset the timer.
              It also gives arrow/swipe navigation its timer reset for free:
              every manual move remounts the step and restarts its clock. */}
          <StepBody key={index} step={step} onComplete={advance} />
        </View>
      </View>
    </GestureDetector>
  );
}

function StepBody({
  step,
  onComplete,
}: {
  step: CalmingProtocolStep;
  onComplete: () => void;
}) {
  if (step.kind === "box-breathing") {
    return <BoxBreathingTimer step={step} onComplete={onComplete} />;
  }
  if (step.kind === "sensory-grounding") {
    return <SensoryGroundingStep step={step} onComplete={onComplete} />;
  }
  return <ProseStep text={step.text} durationMs={step.durationMs} onComplete={onComplete} />;
}

/** Plain-text step (validation / body-grounding / close). Renders the text
 *  centered and advances after `durationMs`.
 *
 *  Callback is stored in a ref so re-renders triggered by parent (which
 *  passes a fresh `advance` reference each render) don't restart the timer. */
function ProseStep({
  text,
  durationMs,
  onComplete,
}: {
  text: { en: string; he: string };
  durationMs: number;
  onComplete: () => void;
}) {
  const { i18n } = useTranslation();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timer = setTimeout(() => {
      onCompleteRef.current();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  return (
    <View className="flex-1 items-center justify-center">
      <Text
        style={{
          color: tokens.text,
          fontFamily: fonts.body,
          fontSize: 18,
          lineHeight: 30,
          textAlign: "center",
        }}
      >
        {localize(text, i18n.language)}
      </Text>
    </View>
  );
}

/** Footer band: back arrow, progress dots, forward arrow. The arrows let the
 *  user pace the protocol manually instead of waiting out each step's timer.
 *  The back arrow stays rendered-but-disabled on the first step so the row
 *  never reflows mid-protocol. */
function StepNav({
  total,
  index,
  onBack,
  onForward,
}: {
  total: number;
  index: number;
  onBack: () => void;
  onForward: () => void;
}) {
  const { t } = useTranslation();
  const atStart = index === 0;

  return (
    <View className="flex-row items-center justify-between px-8 pt-6 pb-2">
      <Pressable
        hitSlop={12}
        disabled={atStart}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t("calming.previousStep")}
        accessibilityState={{ disabled: atStart }}
        style={{ opacity: atStart ? 0.3 : 1 }}
      >
        <Icon name="arrow-left" size={22} color={tokens.text} />
      </Pressable>

      <ProgressDots total={total} index={index} />

      <Pressable
        hitSlop={12}
        onPress={onForward}
        accessibilityRole="button"
        accessibilityLabel={t("calming.nextStep")}
      >
        <Icon name="arrow-right" size={22} color={tokens.text} />
      </Pressable>
    </View>
  );
}

/** Step-progress indicator: one dot per step, current one filled. */
function ProgressDots({ total, index }: { total: number; index: number }) {
  return (
    <View className="flex-row justify-center" style={{ gap: 8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === index ? tokens.accent : tokens.textMute,
            opacity: i === index ? 1 : 0.3,
          }}
        />
      ))}
    </View>
  );
}
