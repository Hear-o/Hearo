import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";
import { Icon } from "@/components/common/Icon";
import { SceneCarousel } from "@/components/features/setup/SceneCarousel";
import { getSounds, localize } from "@/lib/content/content";
import { useSessionStore } from "@/lib/storage/session-store";
import {
  clearSchedule,
  getSchedule,
  setSchedule,
} from "@/lib/integrations/reminders";
import { ReminderSchedule } from "@/lib/storage/storage";
import { persistDisplayName, useDisplayName } from "@/lib/ui/displayName";
import { fonts, tokens } from "@/lib/ui/tokens";

function formatTime(schedule: ReminderSchedule): string {
  const h = schedule.hour.toString().padStart(2, "0");
  const m = schedule.minute.toString().padStart(2, "0");
  return `${h}:${m}`;
}

const SOUNDS = getSounds();

function Check({ selected }: { selected: boolean }) {
  return (
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: selected ? tokens.accent : tokens.textMute,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? tokens.accent : "transparent",
      }}
    >
      {selected ? (
        <Text style={{ color: tokens.bg, fontSize: 12, lineHeight: 12 }}>✓</Text>
      ) : null}
    </View>
  );
}

export default function Setup() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { scene, sounds, setScene, toggleSound } = useSessionStore();

  // Name input — stored to displayName storage; Home reads it via
  // useDisplayName() and refreshes on focus when the user returns.
  const { name: storedName } = useDisplayName();
  const [nameDraft, setNameDraft] = useState<string>(storedName ?? "");
  useEffect(() => {
    if (storedName !== null && storedName !== undefined && nameDraft === "") {
      setNameDraft(storedName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedName]);

  function handleNameBlur() {
    void persistDisplayName(nameDraft);
  }

  // Reminder schedule state — read on mount, refreshed when the picker
  // saves or the user turns it off.
  const [reminder, setReminder] = useState<ReminderSchedule | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // iOS spinner emits onChange continuously while the wheel moves. Stage
  // the value here and commit on an explicit Done press, so editing the
  // time is multi-step. Android's default picker emits once on Set, so
  // the staging step short-circuits and we commit immediately.
  const [pendingTime, setPendingTime] = useState<Date | null>(null);
  useEffect(() => {
    void getSchedule().then(setReminder);
  }, []);

  async function commitTime(date: Date) {
    const next: ReminderSchedule = { hour: date.getHours(), minute: date.getMinutes() };
    await setSchedule(next);
    setReminder(next);
  }

  async function handleReminderChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") {
      // The Android modal closes itself; if the user cancelled, date is
      // undefined and we just drop the picker. Otherwise commit + close.
      setShowTimePicker(false);
      if (event.type === "dismissed" || !date) return;
      await commitTime(date);
      return;
    }
    // iOS spinner: keep the picker open while the wheel turns; just stage
    // the value. Cancelled events on iOS arrive as type="dismissed".
    if (event.type === "dismissed") {
      setShowTimePicker(false);
      setPendingTime(null);
      return;
    }
    if (date) setPendingTime(date);
  }

  async function handleReminderDone() {
    const date = pendingTime ?? defaultPickerValue();
    setShowTimePicker(false);
    setPendingTime(null);
    await commitTime(date);
  }

  function handleReminderCancel() {
    setShowTimePicker(false);
    setPendingTime(null);
  }

  async function handleReminderTurnOff() {
    await clearSchedule();
    setReminder(null);
  }

  function defaultPickerValue() {
    if (reminder) {
      const d = new Date();
      d.setHours(reminder.hour, reminder.minute, 0, 0);
      return d;
    }
    return new Date();
  }

  const handleReady = () => {
    if (sounds.length === 0) return;
    router.push("/home");
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Setup is a form with a horizontal scene carousel, scrollable
          checkboxes, a text input, and a time picker. A screen-level
          swipe-forward GestureDetector here would collide with the
          carousel's pan recognizer — see #58 review. Users tap "Ready"
          (or swipe forward from /home once they reach it) instead. */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Nav element on the leading edge — LEFT in LTR, RIGHT in RTL.
            Crisis on the trailing edge. flex-row auto-flips via I18nManager. */}
        <View className="px-8 pt-4 flex-row justify-between items-center">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Icon name="arrow-left" size={22} color={tokens.text} />
          </Pressable>
          <CrisisAffordance />
        </View>

        <View className="px-8 pt-6">
          <View style={{ width: 28, height: 1, backgroundColor: tokens.accent }} />
        </View>

        {/* Name input — persisted on blur. Empty / whitespace clears the
            stored name so the no-name greeting fallback kicks in. */}
        <Text
          style={{
            color: tokens.text,
            fontFamily: fonts.display,
            fontSize: 28,
            lineHeight: 38,
            marginTop: 24,
            marginBottom: 16,
            paddingHorizontal: 32,
          }}
        >
          {t("setup.nameQuestion")}
        </Text>
        <View style={{ paddingHorizontal: 32, marginBottom: 8 }}>
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            onBlur={handleNameBlur}
            placeholder={t("setup.namePlaceholder")}
            placeholderTextColor={tokens.textMute + "88"}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleNameBlur}
            style={{
              color: tokens.text,
              fontFamily: fonts.body,
              fontSize: 18,
              borderBottomWidth: 1,
              borderBottomColor: tokens.textMute + "55",
              paddingVertical: 8,
            }}
          />
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 13,
              lineHeight: 18,
              marginTop: 6,
            }}
          >
            {t("setup.nameHint")}
          </Text>
        </View>

        <View className="px-8 pt-8">
          <View style={{ width: 28, height: 1, backgroundColor: tokens.textMute, opacity: 0.5 }} />
        </View>

        <Text
          style={{
            color: tokens.text,
            fontFamily: fonts.display,
            fontSize: 28,
            lineHeight: 38,
            marginTop: 24,
            marginBottom: 24,
            paddingHorizontal: 32,
          }}
        >
          {t("setup.sceneQuestion")}
        </Text>

        <SceneCarousel value={scene} onChange={setScene} lang={i18n.language} />

        <View className="px-8 pt-12">
          <View style={{ width: 28, height: 1, backgroundColor: tokens.textMute, opacity: 0.5 }} />
        </View>

        <Text
          style={{
            color: tokens.text,
            fontFamily: fonts.display,
            fontSize: 28,
            lineHeight: 38,
            marginTop: 24,
            marginBottom: 8,
            paddingHorizontal: 32,
          }}
        >
          {t("setup.soundsQuestion")}
        </Text>

        <Text
          style={{
            color: tokens.textMute,
            fontFamily: fonts.body,
            fontSize: 15,
            lineHeight: 22,
            paddingHorizontal: 32,
            marginBottom: 16,
          }}
        >
          {t("setup.soundsHint")}
        </Text>

        <View className="px-8">
          {SOUNDS.map((s) => {
            const selected = sounds.includes(s.key);
            return (
              <Pressable
                key={s.key}
                onPress={() => toggleSound(s.key)}
                hitSlop={6}
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}
              >
                <Check selected={selected} />
                <Text
                  style={{
                    color: selected ? tokens.text : tokens.textMute,
                    fontFamily: fonts.body,
                    fontSize: 17,
                    marginLeft: 14,
                  }}
                >
                  {localize(s.label, i18n.language)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="px-8 pt-12">
          <View style={{ width: 28, height: 1, backgroundColor: tokens.textMute, opacity: 0.5 }} />
        </View>

        <Text
          style={{
            color: tokens.textMute,
            fontFamily: fonts.body,
            fontSize: 13,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            marginTop: 24,
            marginBottom: 10,
            paddingHorizontal: 32,
          }}
        >
          {t("reminders.sectionLabel")}
        </Text>

        <View style={{ paddingHorizontal: 32 }}>
          <Text
            style={{
              color: tokens.text,
              fontFamily: fonts.body,
              fontSize: 18,
              marginBottom: 12,
            }}
          >
            {reminder
              ? t("reminders.currentlySet", { time: formatTime(reminder) })
              : t("reminders.notSet")}
          </Text>

          <View style={{ flexDirection: "row", gap: 24 }}>
            <Pressable onPress={() => setShowTimePicker(true)} hitSlop={8}>
              <Text style={{ color: tokens.accent, fontFamily: fonts.body, fontSize: 15 }}>
                {t("reminders.change")}
              </Text>
            </Pressable>
            {reminder ? (
              <Pressable onPress={handleReminderTurnOff} hitSlop={8}>
                <Text style={{ color: tokens.textMute, fontFamily: fonts.body, fontSize: 15 }}>
                  {t("reminders.turnOff")}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {showTimePicker ? (
            <View style={{ marginTop: 12 }}>
              <DateTimePicker
                value={pendingTime ?? defaultPickerValue()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleReminderChange}
              />
              {/* iOS spinner has no built-in confirm button. We stage the
                  pending value in state and commit on Done; Cancel discards
                  whatever the wheel is currently showing. Android renders
                  a modal that confirms itself, so we hide these buttons. */}
              {Platform.OS === "ios" ? (
                <View style={{ flexDirection: "row", gap: 24, marginTop: 8 }}>
                  <Pressable onPress={handleReminderDone} hitSlop={8}>
                    <Text style={{ color: tokens.accent, fontFamily: fonts.body, fontSize: 15 }}>
                      {t("reminders.done")}
                    </Text>
                  </Pressable>
                  <Pressable onPress={handleReminderCancel} hitSlop={8}>
                    <Text style={{ color: tokens.textMute, fontFamily: fonts.body, fontSize: 15 }}>
                      {t("reminders.cancel")}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View className="px-8 pt-12 pb-6">
          <Pressable
            onPress={handleReady}
            hitSlop={8}
            style={{ opacity: sounds.length === 0 ? 0.4 : 1 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text
                style={{
                  color: tokens.accent,
                  fontFamily: fonts.body,
                  fontSize: 22,
                }}
              >
                {t("setup.ready")}
              </Text>
              <Icon name="arrow-right" size={20} color={tokens.accent} />
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push("/psychoed")}
            hitSlop={8}
            style={{ paddingTop: 24, paddingBottom: 4 }}
          >
            <Text
              style={{
                color: tokens.textMute,
                fontFamily: fonts.body,
                fontSize: 14,
              }}
            >
              {t("setup.rereadIntro")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
