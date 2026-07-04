import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { getClinicalScreening, localize } from "@/lib/content/content";
import { fonts, tokens } from "@/lib/ui/tokens";

type Props = {
  /** Called once the user has answered all 5 items and tapped Submit. */
  onSubmit: (answers: boolean[]) => void;
};

/** Renders the 5 PC-PTSD-5 yes/no items in a vertical list with a single
 *  Submit at bottom. Submit stays disabled until all 5 items have been
 *  answered — partial submission would silently score absent items as `no`
 *  and skew the gate. */
export function PcPtsd5Form({ onSubmit }: Props) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const content = getClinicalScreening();

  // null = unanswered. true/false = the user's pick. Indexed by question position.
  const [answers, setAnswers] = useState<(boolean | null)[]>(
    Array(content.items.questions.length).fill(null),
  );

  function setAnswer(index: number, value: boolean) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  const allAnswered = answers.every((a) => a !== null);

  function handleSubmit() {
    if (!allAnswered) return;
    onSubmit(answers as boolean[]);
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          color: tokens.textMute,
          fontFamily: fonts.body,
          fontSize: 13,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          marginBottom: 14,
          textAlign: "left",
        }}
      >
        {localize(content.items.instructions, lang)}
      </Text>

      {content.items.questions.map((q, i) => (
        <QuestionRow
          key={i}
          questionNumber={i + 1}
          questionText={localize(q, lang)}
          yesLabel={localize(content.items.yes, lang)}
          noLabel={localize(content.items.no, lang)}
          answer={answers[i]}
          onChange={(v) => setAnswer(i, v)}
        />
      ))}

      <Pressable
        onPress={handleSubmit}
        disabled={!allAnswered}
        accessibilityRole="button"
        hitSlop={8}
        style={{
          marginTop: 24,
          borderWidth: 1,
          borderColor: tokens.accent,
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: "center",
          opacity: allAnswered ? 1 : 0.4,
        }}
      >
        <Text
          style={{
            color: tokens.accent,
            fontFamily: fonts.body,
            fontSize: 18,
          }}
        >
          {localize(content.items.submit, lang)}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function QuestionRow({
  questionNumber,
  questionText,
  yesLabel,
  noLabel,
  answer,
  onChange,
}: {
  questionNumber: number;
  questionText: string;
  yesLabel: string;
  noLabel: string;
  answer: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          color: tokens.textMute,
          fontFamily: fonts.body,
          fontSize: 12,
          marginBottom: 6,
          textAlign: "left",
        }}
      >
        {questionNumber} / 5
      </Text>
      <Text
        style={{
          color: tokens.text,
          fontFamily: fonts.body,
          fontSize: 16,
          lineHeight: 24,
          marginBottom: 12,
          textAlign: "left",
        }}
      >
        {questionText}
      </Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <YesNoChip label={yesLabel} selected={answer === true} onPress={() => onChange(true)} />
        <YesNoChip label={noLabel} selected={answer === false} onPress={() => onChange(false)} />
      </View>
    </View>
  );
}

function YesNoChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: selected ? tokens.accent : tokens.textMute,
        borderRadius: 999,
        paddingVertical: 12,
        alignItems: "center",
        backgroundColor: selected ? tokens.accent : "transparent",
      }}
    >
      <Text
        style={{
          color: selected ? tokens.bg : tokens.text,
          fontFamily: fonts.body,
          fontSize: 15,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
