import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { getClinicalScreening, localize } from "@/lib/content/content";
import { fonts, tokens } from "@/lib/ui/tokens";

type Props = {
  /** Called once the user has answered all 4 items and tapped Submit. */
  onSubmit: (answers: number[]) => void;
};

/** Renders the 4 short-PCL items with a 5-point Likert scale (0–4).
 *  Submit stays disabled until all 4 items have been answered. */
export function PcPtsd5Form({ onSubmit }: Props) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const content = getClinicalScreening();

  // null = unanswered. 0–4 = the user's Likert pick. Indexed by question position.
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(content.items.questions.length).fill(null),
  );

  function setAnswer(index: number, value: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  const allAnswered = answers.every((a) => a !== null);

  function handleSubmit() {
    if (!allAnswered) return;
    onSubmit(answers as number[]);
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
        <LikertRow
          key={i}
          questionNumber={i + 1}
          total={content.items.questions.length}
          questionText={localize(q, lang)}
          labels={content.items.likertLabels.map((l) => localize(l, lang))}
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

function LikertRow({
  questionNumber,
  total,
  questionText,
  labels,
  answer,
  onChange,
}: {
  questionNumber: number;
  total: number;
  questionText: string;
  labels: string[];
  answer: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <View style={{ marginBottom: 28 }}>
      <Text
        style={{
          color: tokens.textMute,
          fontFamily: fonts.body,
          fontSize: 12,
          marginBottom: 6,
          textAlign: "left",
        }}
      >
        {questionNumber} / {total}
      </Text>
      <Text
        style={{
          color: tokens.text,
          fontFamily: fonts.body,
          fontSize: 16,
          lineHeight: 24,
          marginBottom: 14,
          textAlign: "left",
        }}
      >
        {questionText}
      </Text>
      <View style={{ gap: 8 }}>
        {labels.map((label, i) => (
          <LikertOption
            key={i}
            label={label}
            selected={answer === i}
            onPress={() => onChange(i)}
          />
        ))}
      </View>
    </View>
  );
}

function LikertOption({
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
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: selected ? tokens.accent : tokens.textMute + "55",
        borderRadius: 12,
        backgroundColor: selected ? tokens.accent + "18" : "transparent",
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: selected ? tokens.accent : tokens.textMute,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {selected && (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: tokens.accent,
            }}
          />
        )}
      </View>
      <Text
        style={{
          color: selected ? tokens.text : tokens.textMute,
          fontFamily: fonts.body,
          fontSize: 15,
          flex: 1,
          textAlign: "left",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
