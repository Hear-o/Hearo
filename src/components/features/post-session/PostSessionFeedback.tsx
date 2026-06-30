// Post-session feedback form.
// Shown after WIND_DOWN completes, before routing to the After screen.
// 4 questions, max 4 screens. Answers held in local state.
// TODO(supabase): persist answers to sessions feedback table when schema lands.

import { useState, useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { fonts, tokens } from "@/lib/ui/tokens";

export interface FeedbackAnswers {
  difficulty: 1 | 2 | 3 | 4 | 5 | null;
  triggerImpact: "yes" | "a-little" | "no" | null;
  moodChange: "better" | "same" | "harder" | null;
}

interface Props {
  onSubmit: (answers: FeedbackAnswers) => void;
  onSkip: () => void;
}

const INITIAL: FeedbackAnswers = {
  difficulty: null,
  triggerImpact: null,
  moodChange: null,
};

// ── Sub-components ────────────────────────────────────────────────────────

function Question({ label }: { label: string }) {
  return (
    <Text
      style={{
        color: tokens.text,
        fontFamily: fonts.display,
        fontSize: 22,
        lineHeight: 30,
        marginBottom: 28,
      }}
    >
      {label}
    </Text>
  );
}

function OptionRow({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onSelect(o.value)}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: selected === o.value ? tokens.accent : tokens.text,
            opacity: selected !== null && selected !== o.value ? 0.45 : 1,
          }}
        >
          <Text
            style={{
              color: selected === o.value ? tokens.accent : tokens.text,
              fontFamily: fonts.body,
              fontSize: 16,
            }}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ScaleRow({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (v: number) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onSelect(n)}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            borderWidth: 1,
            borderColor: selected === n ? tokens.accent : tokens.text,
            alignItems: "center",
            justifyContent: "center",
            opacity: selected !== null && selected !== n ? 0.4 : 1,
          }}
        >
          <Text
            style={{
              color: selected === n ? tokens.accent : tokens.text,
              fontFamily: fonts.body,
              fontSize: 18,
            }}
          >
            {n}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function PostSessionFeedback({ onSubmit, onSkip }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<FeedbackAnswers>(INITIAL);

  // v1.1.8: auto-advance on selection. Hili's UX review flagged that the
  // question timing was unclear — users didn't realize they had to tap Next.
  // 600ms gives the user a beat to register that their tap landed (the
  // accent border flips on the selected option) before the screen moves on,
  // and on the last step we submit the form directly instead of asking for a
  // separate Done tap.
  const ADVANCE_DELAY_MS = 600;
  const advanceAfterPick = useCallback(
    (nextAnswers: FeedbackAnswers, isLastStep: boolean) => {
      setTimeout(() => {
        if (isLastStep) onSubmit(nextAnswers);
        else setStep((s) => s + 1);
      }, ADVANCE_DELAY_MS);
    },
    [onSubmit],
  );

  const stepContent = [
    // Step 0 — difficulty
    <View key="difficulty">
      <Question label={t("postSession.difficultyQuestion")} />
      <ScaleRow
        selected={answers.difficulty}
        onSelect={(v) => {
          const next = { ...answers, difficulty: v as FeedbackAnswers["difficulty"] };
          setAnswers(next);
          advanceAfterPick(next, false);
        }}
      />
    </View>,

    // Step 1 — trigger impact
    <View key="impact">
      <Question label={t("postSession.impactQuestion")} />
      <OptionRow
        selected={answers.triggerImpact}
        onSelect={(v) => {
          const next = { ...answers, triggerImpact: v as FeedbackAnswers["triggerImpact"] };
          setAnswers(next);
          advanceAfterPick(next, false);
        }}
        options={[
          { value: "yes", label: t("postSession.impactYes") },
          { value: "a-little", label: t("postSession.impactALittle") },
          { value: "no", label: t("postSession.impactNo") },
        ]}
      />
    </View>,

    // Step 2 — mood change (final step; the previous "anything else?"
    // open-text question was removed per UI QA — it added friction without
    // surfacing actionable signal).
    <View key="mood">
      <Question label={t("postSession.moodQuestion")} />
      <OptionRow
        selected={answers.moodChange}
        onSelect={(v) => {
          const next = { ...answers, moodChange: v as FeedbackAnswers["moodChange"] };
          setAnswers(next);
          advanceAfterPick(next, true);
        }}
        options={[
          { value: "better", label: t("postSession.moodBetter") },
          { value: "same", label: t("postSession.moodSame") },
          { value: "harder", label: t("postSession.moodHarder") },
        ]}
      />
    </View>,
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 24 }}>
        {/* Progress dots */}
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 40 }}>
          {stepContent.map((_, i) => (
            <View
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i <= step ? tokens.accent : tokens.text + "33",
              }}
            />
          ))}
        </View>

        {/* Question */}
        <View style={{ flex: 1 }}>{stepContent[step]}</View>

        {/* Skip — Next/Done removed in v1.1.8 since selections now auto-advance
            (Hili UX review: questions didn't auto-advance, users scrolled
            looking for Next). Skip stays as the single secondary action. */}
        <View
          style={{
            alignItems: "flex-start",
            paddingBottom: 24,
          }}
        >
          <Pressable hitSlop={12} onPress={onSkip}>
            <Text style={{ color: tokens.text, fontFamily: fonts.body, fontSize: 14, opacity: 0.5 }}>
              {t("postSession.skip")}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
