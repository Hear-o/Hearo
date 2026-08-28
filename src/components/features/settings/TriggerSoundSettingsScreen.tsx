import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/common/Icon";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { AccessibleSlider } from "@/components/features/settings/AccessibleSlider";
import { AudioEngine, dBToGain } from "@/lib/audio/audio-engine";
import { activateAudioSession } from "@/lib/audio/audio-session";
import {
  DEFAULT_TRIGGER_SOUND_PREFERENCE,
  TRIGGER_RATE_STEPS,
  TRIGGER_SOUND_PREFERENCE_VERSION,
  TRIGGER_VOLUME_DB_STEPS,
  TriggerSoundPreference,
  triggerIntervalSeconds,
  triggerVolumeDbToPercent,
} from "@/lib/audio/trigger-preferences";
import { getSound } from "@/lib/content/content";
import { useSessionStore } from "@/lib/storage/session-store";
import {
  getTriggerSoundPreference,
  setTriggerSoundPreference,
} from "@/lib/storage/storage";
import { usePageFade } from "@/lib/ui/fadeTransition";
import { fonts, tokens, type } from "@/lib/ui/tokens";

export function TriggerSoundSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { animatedStyle, transition } = usePageFade();
  const selectedSounds = useSessionStore((state) => state.sounds);
  const [draft, setDraft] = useState<TriggerSoundPreference>({
    ...DEFAULT_TRIGGER_SOUND_PREFERENCE,
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewEngineRef = useRef<AudioEngine | null>(null);
  const previewRunRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void getTriggerSoundPreference()
      .then((preference) => {
        if (!cancelled) setDraft(preference);
      })
      .catch(() => {
        if (!cancelled) setError(t("triggerSound.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
      previewRunRef.current += 1;
      previewEngineRef.current?.destroy();
      previewEngineRef.current = null;
    };
  }, [t]);

  const minimumPercent = triggerVolumeDbToPercent(draft.minimumPeakDb);
  const maximumPercent = triggerVolumeDbToPercent(draft.maximumPeakDb);
  const intervalSeconds = triggerIntervalSeconds(draft.triggersPerMinute);

  function paceLabel(rate: number): string {
    if (rate <= 0.75) return t("triggerSound.paceSlow");
    if (rate >= 1.5) return t("triggerSound.paceFrequent");
    return t("triggerSound.paceSteady");
  }

  function updateMinimum(minimumPeakDb: number) {
    setDraft((current) => ({
      ...current,
      minimumPeakDb,
      maximumPeakDb: Math.max(current.maximumPeakDb, minimumPeakDb),
    }));
    setError(null);
  }

  function updateMaximum(maximumPeakDb: number) {
    setDraft((current) => ({
      ...current,
      minimumPeakDb: Math.min(current.minimumPeakDb, maximumPeakDb),
      maximumPeakDb,
    }));
    setError(null);
  }

  async function handlePreview() {
    if (!loaded) return;
    const run = ++previewRunRef.current;
    setError(null);
    setPreviewing(true);
    try {
      let previewEngine = previewEngineRef.current;
      if (!previewEngine) {
        previewEngine = new AudioEngine();
        previewEngineRef.current = previewEngine;
      }
      previewEngine.stopTriggerPreview();
      const activated = await activateAudioSession();
      if (run !== previewRunRef.current) return;
      if (!activated) throw new Error("audio session activation failed");
      const soundKey = selectedSounds[0] ?? "motorcycle";
      const source = getSound(soundKey).audioVariations[0];
      if (source === undefined) throw new Error("preview source unavailable");
      await previewEngine.loadTrigger(source);
      if (run !== previewRunRef.current) return;
      await previewEngine.playTriggerPreview(dBToGain(draft.maximumPeakDb));
    } catch {
      if (run === previewRunRef.current) {
        setError(t("triggerSound.previewError"));
      }
    } finally {
      if (run === previewRunRef.current) setPreviewing(false);
    }
  }

  async function handleSave() {
    if (!loaded || saving) return;
    setSaving(true);
    setError(null);
    try {
      await setTriggerSoundPreference({
        ...draft,
        schemaVersion: TRIGGER_SOUND_PREFERENCE_VERSION,
      });
      previewRunRef.current += 1;
      previewEngineRef.current?.stopTriggerPreview();
      transition(() => router.back());
    } catch {
      setError(t("triggerSound.saveError"));
      setSaving(false);
    }
  }

  function handleBack() {
    previewRunRef.current += 1;
    previewEngineRef.current?.stopTriggerPreview();
    transition(() => router.back());
  }

  function resetDraft() {
    setDraft({ ...DEFAULT_TRIGGER_SOUND_PREFERENCE });
    setError(null);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <ScreenHeader
          left={
            <Pressable
              onPress={handleBack}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("triggerSound.back")}
              style={{ width: 44, height: 44, justifyContent: "center" }}
            >
              <Icon name="arrow-left" size={22} color={tokens.text} />
            </Pressable>
          }
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              color: tokens.text,
              fontFamily: fonts.display,
              ...type.hero,
              marginTop: 20,
            }}
          >
            {t("triggerSound.title")}
          </Text>
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              ...type.body,
              marginTop: 10,
              maxWidth: 520,
            }}
          >
            {t("triggerSound.description")}
          </Text>

          <View
            style={{
              marginTop: 28,
              paddingVertical: 18,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: tokens.textMute + "30",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: tokens.text,
                  fontFamily: fonts.bodyMedium,
                  ...type.body,
                }}
              >
                {t("triggerSound.previewTitle")}
              </Text>
              <Text
                style={{
                  color: tokens.textMute,
                  fontFamily: fonts.body,
                  ...type.caption,
                  marginTop: 2,
                }}
              >
                {t("triggerSound.previewHint", { percent: maximumPercent })}
              </Text>
            </View>
            <Pressable
              onPress={() => void handlePreview()}
              disabled={!loaded || previewing}
              accessibilityRole="button"
              accessibilityState={{ disabled: !loaded || previewing }}
              style={{
                minHeight: 44,
                paddingHorizontal: 18,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: tokens.accent,
                justifyContent: "center",
                opacity: !loaded || previewing ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  color: tokens.accentSoft,
                  fontFamily: fonts.bodyMedium,
                  fontSize: 15,
                }}
              >
                {previewing
                  ? t("triggerSound.previewing")
                  : t("triggerSound.preview")}
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 30, gap: 24 }}>
            <AccessibleSlider
              testID="minimum-volume-slider"
              label={t("triggerSound.minimumVolume")}
              value={draft.minimumPeakDb}
              values={TRIGGER_VOLUME_DB_STEPS}
              displayValue={t("triggerSound.percent", {
                value: minimumPercent,
              })}
              incrementLabel={t("triggerSound.increase")}
              decrementLabel={t("triggerSound.decrease")}
              onChange={updateMinimum}
              disabled={!loaded}
            />
            <AccessibleSlider
              testID="maximum-volume-slider"
              label={t("triggerSound.maximumVolume")}
              value={draft.maximumPeakDb}
              values={TRIGGER_VOLUME_DB_STEPS}
              displayValue={t("triggerSound.percent", {
                value: maximumPercent,
              })}
              incrementLabel={t("triggerSound.increase")}
              decrementLabel={t("triggerSound.decrease")}
              onChange={updateMaximum}
              disabled={!loaded}
            />
          </View>

          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              ...type.caption,
              marginTop: 2,
            }}
          >
            {t("triggerSound.volumeHint")}
          </Text>

          <View
            style={{
              height: 1,
              backgroundColor: tokens.textMute + "30",
              marginVertical: 30,
            }}
          />

          <AccessibleSlider
            testID="pace-slider"
            label={t("triggerSound.pace")}
            value={draft.triggersPerMinute}
            values={TRIGGER_RATE_STEPS}
            displayValue={paceLabel(draft.triggersPerMinute)}
            incrementLabel={t("triggerSound.increase")}
            decrementLabel={t("triggerSound.decrease")}
            onChange={(triggersPerMinute) => {
              setDraft((current) => ({ ...current, triggersPerMinute }));
              setError(null);
            }}
            disabled={!loaded}
          />
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              ...type.caption,
              marginTop: 2,
            }}
          >
            {t("triggerSound.interval", { seconds: intervalSeconds })}
          </Text>

          {error ? (
            <Text
              accessibilityRole="alert"
              style={{
                color: tokens.critical,
                fontFamily: fonts.bodyMedium,
                ...type.caption,
                marginTop: 24,
              }}
            >
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={resetDraft}
            disabled={!loaded}
            accessibilityRole="button"
            style={{ alignSelf: "flex-start", marginTop: 28, minHeight: 44 }}
          >
            <Text
              style={{
                color: tokens.accentSoft,
                fontFamily: fonts.bodyMedium,
                ...type.caption,
                textDecorationLine: "underline",
              }}
            >
              {t("triggerSound.reset")}
            </Text>
          </Pressable>
        </ScrollView>

        <View
          style={{
            paddingHorizontal: 32,
            paddingTop: 14,
            paddingBottom: 16,
            borderTopWidth: 1,
            borderColor: tokens.textMute + "25",
            backgroundColor: tokens.bg,
          }}
        >
          <Pressable
            testID="save-trigger-sound"
            onPress={() => void handleSave()}
            disabled={!loaded || saving}
            accessibilityRole="button"
            accessibilityState={{ disabled: !loaded || saving }}
            style={{
              minHeight: 52,
              borderRadius: 14,
              backgroundColor: tokens.accent,
              alignItems: "center",
              justifyContent: "center",
              opacity: !loaded || saving ? 0.55 : 1,
            }}
          >
            <Text
              style={{
                color: tokens.sceneText,
                fontFamily: fonts.bodyMedium,
                fontSize: 17,
              }}
            >
              {saving
                ? t("triggerSound.saving")
                : t("triggerSound.save")}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
