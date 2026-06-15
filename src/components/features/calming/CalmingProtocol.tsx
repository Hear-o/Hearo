import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";

import { BoxBreathingTimer } from "./BoxBreathingTimer";
import { SensoryGroundingStep } from "./SensoryGroundingStep";
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

  // Swipe-to-advance: a horizontal pan past SWIPE_THRESHOLD_PX skips ahead
  // to the next step, same effect as the per-step timer firing. Direction-
  // agnostic for LTR/RTL parity.
  const swipeGesture = Gesture.Pan()
    .minDistance(SWIPE_THRESHOLD_PX)
    .onEnd((event) => {
      if (Math.abs(event.translationX) >= SWIPE_THRESHOLD_PX) {
        advance();
      }
    })
    .runOnJS(true);

  const step = protocol[index];
  if (!step) return null;

  return (
    <GestureDetector gesture={swipeGesture}>
      <View className="flex-1">
        <ProgressDots total={protocol.length} index={index} />
        <View className="flex-1 px-8 pb-8">
          {/* `key` forces unmount + remount when the step changes — without
              it, two consecutive prose steps with identical `durationMs`
              would reuse the same React instance and not reset the timer. */}
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

/** Step-progress indicator: one dot per step, current one filled. */
function ProgressDots({ total, index }: { total: number; index: number }) {
  return (
    <View className="flex-row justify-center pt-6 pb-2" style={{ gap: 8 }}>
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
