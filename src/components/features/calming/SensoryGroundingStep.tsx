import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { CalmingSensoryStep, localize } from "@/lib/content/content";
import { fonts, tokens } from "@/lib/ui/tokens";

type Props = {
  step: CalmingSensoryStep;
  onComplete: () => void;
};

/** 3-2-1 sensory grounding. Each sub-step shows for its `durationMs`, then
 *  advances. On the last sub-step's timer firing, `onComplete` runs. */
export function SensoryGroundingStep({ step, onComplete }: Props) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [index, setIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const sub = step.steps[index];
    if (!sub) return;

    const timer = setTimeout(() => {
      if (index + 1 < step.steps.length) {
        setIndex(index + 1);
      } else {
        onCompleteRef.current();
      }
    }, sub.durationMs);

    return () => clearTimeout(timer);
  }, [index, step.steps]);

  const current = step.steps[index];
  if (!current) return null;

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text
        style={{
          color: tokens.accent,
          fontFamily: fonts.display,
          fontSize: 80,
          lineHeight: 90,
          marginBottom: 12,
        }}
      >
        {current.count}
      </Text>
      <Text
        accessibilityLiveRegion="polite"
        style={{
          color: tokens.text,
          fontFamily: fonts.display,
          fontSize: 22,
          lineHeight: 30,
          textAlign: "center",
        }}
      >
        {localize(current.prompt, lang)}
      </Text>
    </View>
  );
}
