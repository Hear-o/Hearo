import { useEffect, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";

import {
  clearSchedule,
  getSchedule,
  setSchedule,
} from "@/lib/integrations/reminders";
import { useSettingsSheetStore } from "@/lib/storage/settings-sheet-store";
import { ReminderSchedule } from "@/lib/storage/storage";
import { persistDisplayName, useDisplayName } from "@/lib/ui/displayName";
import { fonts, tokens } from "@/lib/ui/tokens";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.78, 600);
const SLIDE_MS = 380;

function formatTime(schedule: ReminderSchedule): string {
  const h = schedule.hour.toString().padStart(2, "0");
  const m = schedule.minute.toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Bottom-sheet settings overlay.
 *
 *  Holds the two pieces of user preference that aren't tied to a single
 *  session: the display name (used in greetings) and the daily reminder
 *  schedule. Both used to live on Setup; v1.0.9 moved them here so Setup
 *  stays focused on session content (scene + sounds).
 *
 *  Open/close state is driven by useSettingsSheetStore (parallel to
 *  useCrisisStore). The sheet is rendered globally from _layout.tsx so any
 *  screen can pop it open via the store's `open()` action. */
export function SettingsSheet() {
  const { t } = useTranslation();
  const isOpen = useSettingsSheetStore((s) => s.isOpen);
  const close = useSettingsSheetStore((s) => s.close);

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // Name input — persisted on blur. Mirrors the previous Setup logic.
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

  // Reminder state — read on open, refreshed when picker saves or turns off.
  const [reminder, setReminder] = useState<ReminderSchedule | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingTime, setPendingTime] = useState<Date | null>(null);
  useEffect(() => {
    if (isOpen) {
      void getSchedule().then(setReminder);
    }
  }, [isOpen]);

  async function commitTime(date: Date) {
    const next: ReminderSchedule = { hour: date.getHours(), minute: date.getMinutes() };
    await setSchedule(next);
    setReminder(next);
  }

  async function handleReminderChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
      if (event.type === "dismissed" || !date) return;
      await commitTime(date);
      return;
    }
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

  // Slide-up + backdrop-fade animation, paired with the store's isOpen flag.
  useEffect(() => {
    if (isOpen) {
      translateY.value = withTiming(0, {
        duration: SLIDE_MS,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0.55, { duration: SLIDE_MS });
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, {
        duration: SLIDE_MS,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0, { duration: SLIDE_MS });
      // Drop any in-flight picker state so the sheet re-opens clean.
      setShowTimePicker(false);
      setPendingTime(null);
    }
  }, [isOpen, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <View
      pointerEvents={isOpen ? "auto" : "none"}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        elevation: 1000,
      }}
    >
      <Animated.View
        style={[
          { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000" },
          backdropStyle,
        ]}
      >
        <Pressable
          onPress={close}
          style={{ flex: 1 }}
          accessibilityLabel={t("settings.dismiss")}
        />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: SHEET_HEIGHT,
            backgroundColor: tokens.bgElev,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 32,
            paddingTop: 16,
            paddingBottom: 28,
          },
          sheetStyle,
        ]}
      >
        {/* Drag handle visual cue */}
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: tokens.textMute,
              opacity: 0.35,
            }}
          />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              color: tokens.text,
              fontFamily: fonts.display,
              fontSize: 26,
              lineHeight: 34,
              marginBottom: 24,
            }}
          >
            {t("settings.title")}
          </Text>

          {/* Name */}
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 13,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            {t("settings.nameLabel")}
          </Text>
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

          {/* Reminder */}
          <View
            style={{
              width: 28,
              height: 1,
              backgroundColor: tokens.textMute,
              opacity: 0.4,
              marginTop: 28,
              marginBottom: 20,
            }}
          />
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 13,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            {t("reminders.sectionLabel")}
          </Text>
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
        </ScrollView>
      </Animated.View>
    </View>
  );
}
