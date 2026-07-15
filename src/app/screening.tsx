import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";
import { Pcl4Form } from "@/components/features/screening/Pcl4Form";
import {
  computeClinicalScreeningOutcome,
  getClinicalScreening,
  localize,
} from "@/lib/content/content";
import {
  ClinicalScreeningOutcome,
  setClinicalScreeningResult,
} from "@/lib/storage/storage";
import { fonts, tokens } from "@/lib/ui/tokens";

/** Internal step machine. Step transitions are deterministic from the user's
 *  inputs, so we drive them with a single union state rather than per-screen
 *  routes — the screening lives at a single Expo Router path. */
type ScreenStep =
  | { kind: "intro" }
  | { kind: "items" }
  | { kind: "outcome"; outcome: ClinicalScreeningOutcome };

export default function Screening() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const content = getClinicalScreening();
  const [step, setStep] = useState<ScreenStep>({ kind: "intro" });

  /** Step 1 → trauma-exposure answered. Persist immediately for "no" path
   *  (items not administered); transition to items for "yes". */
  async function handleTraumaExposureAnswer(traumaExposure: boolean) {
    if (!traumaExposure) {
      const { score, outcome } = computeClinicalScreeningOutcome(false, [], content.cutoff);
      await setClinicalScreeningResult({
        instrument: "pc-ptsd-5",
        version: content.version,
        traumaExposure: false,
        answers: [],
        score,
        cutoff: content.cutoff,
        outcome,
        takenAt: Date.now(),
      });
      setStep({ kind: "outcome", outcome });
      return;
    }
    setStep({ kind: "items" });
  }

  /** Step 2 → 4 Likert items answered. Score, persist, transition to outcome. */
  async function handleItemsSubmit(answers: number[]) {
    const { score, outcome } = computeClinicalScreeningOutcome(true, answers, content.cutoff);
    await setClinicalScreeningResult({
      instrument: "pc-ptsd-5",
      version: content.version,
      traumaExposure: true,
      answers,
      score,
      cutoff: content.cutoff,
      outcome,
      takenAt: Date.now(),
    });
    setStep({ kind: "outcome", outcome });
  }

  /** Step 3 → user dismisses the outcome card and continues into Setup. */
  function handleContinue() {
    router.replace("/setup");
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row justify-between items-center pt-2 px-8">
        <CrisisAffordance />
      </View>

      {step.kind === "intro" && (
        <IntroStep lang={lang} onAnswer={handleTraumaExposureAnswer} />
      )}

      {step.kind === "items" && <Pcl4Form onSubmit={handleItemsSubmit} />}

      {step.kind === "outcome" && step.outcome === "no-trauma" && (
        <NoTraumaOutcome lang={lang} onContinue={handleContinue} />
      )}

      {step.kind === "outcome" && step.outcome === "below-threshold" && (
        <BelowThresholdOutcome lang={lang} onContinue={handleContinue} />
      )}

      {step.kind === "outcome" && step.outcome === "above-threshold" && (
        <AboveThresholdOutcome lang={lang} onContinue={handleContinue} />
      )}
    </SafeAreaView>
  );
}

// ── Step 1: intro + trauma-exposure question ──────────────────────────────────

function IntroStep({
  lang,
  onAnswer,
}: {
  lang: string;
  onAnswer: (traumaExposure: boolean) => void;
}) {
  const content = getClinicalScreening();
  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 24, paddingBottom: 24 }}
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
        {localize(content.intro.eyebrow, lang)}
      </Text>
      <Text
        style={{
          color: tokens.text,
          fontFamily: fonts.display,
          fontSize: 28,
          lineHeight: 38,
          marginBottom: 16,
          textAlign: "left",
        }}
      >
        {localize(content.intro.heading, lang)}
      </Text>
      <Text
        style={{
          color: tokens.textMute,
          fontFamily: fonts.body,
          fontSize: 15,
          lineHeight: 24,
          marginBottom: 32,
          textAlign: "left",
        }}
      >
        {localize(content.intro.body, lang)}
      </Text>

      <Text
        style={{
          color: tokens.text,
          fontFamily: fonts.body,
          fontSize: 16,
          lineHeight: 26,
          marginBottom: 24,
          textAlign: "left",
        }}
      >
        {localize(content.traumaExposure.prompt, lang)}
      </Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          onPress={() => onAnswer(true)}
          accessibilityRole="button"
          hitSlop={8}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: tokens.accent,
            borderRadius: 999,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: tokens.accent, fontFamily: fonts.body, fontSize: 18 }}>
            {localize(content.traumaExposure.yes, lang)}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onAnswer(false)}
          accessibilityRole="button"
          hitSlop={8}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: tokens.textMute,
            borderRadius: 999,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: tokens.text, fontFamily: fonts.body, fontSize: 18 }}>
            {localize(content.traumaExposure.no, lang)}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ── Step 3: outcome screens ───────────────────────────────────────────────────

function NoTraumaOutcome({ lang, onContinue }: { lang: string; onContinue: () => void }) {
  const c = getClinicalScreening().outcomes.noTrauma;
  return <ProseOutcome lang={lang} heading={c.heading} body={c.body} continueLabel={c.continueLabel} onContinue={onContinue} />;
}

function BelowThresholdOutcome({ lang, onContinue }: { lang: string; onContinue: () => void }) {
  const c = getClinicalScreening().outcomes.belowThreshold;
  return <ProseOutcome lang={lang} heading={c.heading} body={c.body} continueLabel={c.continueLabel} onContinue={onContinue} />;
}

function ProseOutcome({
  lang,
  heading,
  body,
  continueLabel,
  onContinue,
}: {
  lang: string;
  heading: { en: string; he: string };
  body: { en: string; he: string };
  continueLabel: { en: string; he: string };
  onContinue: () => void;
}) {
  return (
    <View className="flex-1 px-8 pt-6 pb-6">
      <View className="flex-1 justify-center">
        <Text
          style={{
            color: tokens.text,
            fontFamily: fonts.display,
            fontSize: 28,
            lineHeight: 38,
            marginBottom: 16,
          }}
        >
          {localize(heading, lang)}
        </Text>
        <Text
          style={{
            color: tokens.textMute,
            fontFamily: fonts.body,
            fontSize: 16,
            lineHeight: 26,
          }}
        >
          {localize(body, lang)}
        </Text>
      </View>
      <Pressable
        onPress={onContinue}
        hitSlop={8}
        accessibilityRole="button"
        style={{
          borderWidth: 1,
          borderColor: tokens.accent,
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: tokens.accent, fontFamily: fonts.body, fontSize: 18 }}>
          {localize(continueLabel, lang)}
        </Text>
      </Pressable>
    </View>
  );
}

function AboveThresholdOutcome({ lang, onContinue }: { lang: string; onContinue: () => void }) {
  const c = getClinicalScreening().outcomes.aboveThreshold;
  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 24, paddingBottom: 24, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 justify-center">
        <Text
          style={{
            color: tokens.text,
            fontFamily: fonts.display,
            fontSize: 28,
            lineHeight: 38,
            marginBottom: 16,
          }}
        >
          {localize(c.heading, lang)}
        </Text>
        <Text
          style={{
            color: tokens.textMute,
            fontFamily: fonts.body,
            fontSize: 16,
            lineHeight: 26,
            marginBottom: 24,
          }}
        >
          {localize(c.body, lang)}
        </Text>

        {/* G-01: the Mativ deep-link button lands with the partnership.
            Until then, no affordance — referring without a real destination
            is a no-op the user would tap and be confused by. The body copy
            above already says "we work with the Mativ Institute and can put
            you in touch", which carries the message without a dead button. */}
      </View>

      <Pressable
        onPress={onContinue}
        hitSlop={8}
        accessibilityRole="button"
        style={{
          borderWidth: 1,
          borderColor: tokens.accent,
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: tokens.accent, fontFamily: fonts.body, fontSize: 18 }}>
          {localize(c.continueLabel, lang)}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
