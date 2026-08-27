import { useEffect, useState } from "react";
import {
  Dimensions,
  I18nManager,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Updates from "expo-updates";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/common/Icon";
import { NameTextInput } from "@/components/common/NameTextInput";
import * as healthKit from "@/lib/integrations/healthKit";
import {
  clearSchedule,
  getSchedule,
  setSchedule,
} from "@/lib/integrations/reminders";
import { useSettingsSheetStore } from "@/lib/storage/settings-sheet-store";
import {
  getDisplayName,
  getReminderTime,
  LanguagePreference,
  ReminderSchedule,
  setLanguagePreference,
  setReminderTime,
} from "@/lib/storage/storage";
import { useNameDraft } from "@/lib/ui/displayName";
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
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isOpen = useSettingsSheetStore((s) => s.isOpen);
  const close = useSettingsSheetStore((s) => s.close);
  const [languageSwitching, setLanguageSwitching] = useState(false);

  // Toggling the language requires a clean app restart: React Native's RTL
  // layout direction (I18nManager.forceRTL) only takes effect on the next
  // launch, and live-mixing LTR text with an RTL-laid-out screen produces
  // glaringly broken UI. Persist the preference, flip the i18n + RTL flags,
  // then reload via expo-updates so the app comes back up clean.
  //
  // v1.1.10: added a 500ms wait between forceRTL and reloadAsync.
  // I18nManager.forceRTL only writes to NSUserDefaults via an async bridge
  // call — reloading immediately can catch the stale value and leave the
  // layout in the wrong direction. See AppDelegate.swift for the native
  // side of this contract.
  async function handleLanguageChange(next: LanguagePreference) {
    if (next === i18n.language || languageSwitching) return;
    setLanguageSwitching(true);
    try {
      await setLanguagePreference(next);
      await i18n.changeLanguage(next);
      const shouldBeRTL = next === "he";
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await Updates.reloadAsync();
    } catch {
      // Dev build (no Updates module wired) or reload race — leave the flag
      // set so the next manual relaunch picks up the new preference.
      setLanguageSwitching(false);
    }
  }

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const nameDraft = useNameDraft();

  // Reminder state — read on open, refreshed when picker saves or turns off.
  // v1.1.6: redesigned as a Switch + always-visible iOS spinner. Previous
  // change/turn-off link pair + on-demand modal felt buried; the Switch
  // makes on/off the headline control and the inline scroller lets the user
  // dial the time without opening a separate modal step.
  const [reminder, setReminder] = useState<ReminderSchedule | null>(null);
  // The last time the user picked, remembered even while the reminder is off so
  // re-enabling restores it instead of snapping back to the 9:00 default.
  const [lastTime, setLastTime] = useState<ReminderSchedule | null>(null);
  // Android-only: the legacy modal flow is preserved behind a press handler
  // since RN's DateTimePicker on Android has no inline display mode.
  const [androidPickerOpen, setAndroidPickerOpen] = useState(false);
  // iOS spinner is now gated (was always-visible): opens when the reminder is
  // switched on or via "change time", dismissed by Done or an outside tap.
  const [iosPickerOpen, setIosPickerOpen] = useState(false);

  // Pulse / Apple Watch connection — same "idle|granted|denied" machine and
  // HealthKit calls as the Permissions screen (permissions.tsx). Settings is
  // the fallback for users who skipped connecting during onboarding.
  const [pulseStatus, setPulseStatus] = useState<"idle" | "granted" | "denied">("idle");

  useEffect(() => {
    if (isOpen) {
      void getSchedule().then(setReminder);
      void getReminderTime().then(setLastTime);
      void healthKit.getAuthorizationStatus().then((status) => {
        if (status === "granted" || status === "requested") setPulseStatus("granted");
      });
      // The sheet is an always-mounted overlay, not a routed screen, so
      // useNameDraft's own useFocusEffect (route-focus-based) never fires
      // just from opening it — re-sync from storage directly on open,
      // same reasoning as the reminder/pulse re-fetches above.
      void getDisplayName().then((stored) => {
        if (stored !== undefined) nameDraft.onChangeText(stored ?? "");
      });
    } else {
      setIosPickerOpen(false);
    }
    // nameDraft is a fresh object every render (its onChangeText is the
    // stable setState it wraps) — adding it here would refire this effect
    // on every render instead of just on isOpen changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function onConnectWatch() {
    const status = await healthKit.requestAuthorization();
    setPulseStatus(status === "granted" || status === "requested" ? "granted" : "denied");
  }

  async function commitTime(date: Date) {
    const next: ReminderSchedule = { hour: date.getHours(), minute: date.getMinutes() };
    await setSchedule(next);
    await setReminderTime(next); // remember it even if the reminder is later turned off
    setReminder(next);
    setLastTime(next);
  }

  // Default time when the Switch is first turned on — 9:00 AM is a generally
  // safe waking-hour default for a wellness reminder. The user can scroll to
  // anything they want immediately afterward.
  function defaultReminderTime(): ReminderSchedule {
    return { hour: 9, minute: 0 };
  }

  async function handleReminderToggle(next: boolean) {
    if (next) {
      // Restore the last time the user picked (survives toggling off + restart);
      // fall back to 9:00 only if they've never set one.
      const initial = reminder ?? lastTime ?? defaultReminderTime();
      await setSchedule(initial);
      await setReminderTime(initial);
      setReminder(initial);
      setLastTime(initial);
      if (Platform.OS === "ios") setIosPickerOpen(true);
    } else {
      // Turn the reminder off but keep the remembered time (lastTime/storage).
      await clearSchedule();
      setReminder(null);
      setIosPickerOpen(false);
    }
  }

  // iOS spinner fires onChange continuously as the user scrolls. Committing
  // on every tick is fine — setSchedule cancels + reschedules the OS
  // notification atomically; AsyncStorage writes are cheap.
  async function handleInlinePickerChange(_event: DateTimePickerEvent, date?: Date) {
    if (!date) return;
    await commitTime(date);
  }

  async function handleAndroidPickerChange(event: DateTimePickerEvent, date?: Date) {
    setAndroidPickerOpen(false);
    if (event.type === "dismissed" || !date) return;
    await commitTime(date);
  }

  function pickerValue(): Date {
    const d = new Date();
    if (reminder) {
      d.setHours(reminder.hour, reminder.minute, 0, 0);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    return d;
  }

  function openTriggerSoundSettings() {
    close();
    router.push("/trigger-sound");
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
      // Close the Android time-picker modal on sheet dismiss so it doesn't
      // reappear orphaned the next time the sheet opens.
      setAndroidPickerOpen(false);
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
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              color: tokens.text,
              fontFamily: fonts.display,
              fontSize: 26,
              lineHeight: 34,
              marginBottom: 24,
              textAlign: "left",
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
              textAlign: "left",
            }}
          >
            {t("settings.nameLabel")}
          </Text>
          <NameTextInput
            value={nameDraft.value}
            onChangeText={nameDraft.onChangeText}
            onBlur={nameDraft.onBlur}
          />
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 13,
              lineHeight: 18,
              marginTop: 6,
              textAlign: "left",
            }}
          >
            {t("setup.nameHint")}
          </Text>

          {/* Language */}
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
              marginBottom: 12,
              textAlign: "left",
            }}
          >
            {t("settings.languageLabel")}
          </Text>
          {/* Pinned, not RTL-mirrored: עברית stays on the right and English
              on the left in both language modes. Yoga already RTL-flips
              "row" when I18nManager.isRTL is true (see plugins/withRtl.js),
              so this counter-flips per direction to hold the pin. */}
          <View style={{ flexDirection: I18nManager.isRTL ? "row" : "row-reverse", gap: 10 }}>
            {(["he", "en"] as const).map((lng) => {
              const selected = i18n.language === lng;
              const label =
                lng === "he"
                  ? t("settings.languageHebrew")
                  : t("settings.languageEnglish");
              return (
                <Pressable
                  key={lng}
                  onPress={() => handleLanguageChange(lng)}
                  disabled={languageSwitching}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: languageSwitching }}
                  accessibilityLabel={label}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: selected ? tokens.accent : tokens.textMute + "55",
                    borderRadius: 999,
                    backgroundColor: selected ? tokens.accent : "transparent",
                    opacity: languageSwitching && !selected ? 0.5 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? tokens.bg : tokens.text,
                      fontFamily: fonts.body,
                      fontSize: 17,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 13,
              lineHeight: 18,
              marginTop: 8,
              textAlign: "left",
            }}
          >
            {t("settings.languageRestartNote")}
          </Text>

          {/* Practice-sound tuning lives on a full routed page so the range,
              pace, preview, and save state have enough room and a predictable
              screen-reader order. */}
          <View
            style={{
              width: 28,
              height: 1,
              backgroundColor: tokens.textMute,
              opacity: 0.4,
              marginTop: 28,
              marginBottom: 14,
            }}
          />
          <Pressable
            onPress={openTriggerSoundSettings}
            accessibilityRole="button"
            accessibilityLabel={t("triggerSound.settingsLink")}
            accessibilityHint={t("triggerSound.settingsLinkHint")}
            style={{
              minHeight: 56,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: tokens.text,
                  fontFamily: fonts.bodyMedium,
                  fontSize: 17,
                  lineHeight: 24,
                  textAlign: "left",
                }}
              >
                {t("triggerSound.settingsLink")}
              </Text>
              <Text
                style={{
                  color: tokens.textMute,
                  fontFamily: fonts.body,
                  fontSize: 13,
                  lineHeight: 18,
                  marginTop: 2,
                  textAlign: "left",
                }}
              >
                {t("triggerSound.settingsLinkHint")}
              </Text>
            </View>
            <Icon name="arrow-right" size={18} color={tokens.accentSoft} />
          </Pressable>

          {/* Apple Watch / pulse — fallback connect for users who skipped it
              during onboarding. Reuses the Permissions HealthKit flow + copy. */}
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
              textAlign: "left",
            }}
          >
            {t("permissions.pulseTitle")}
          </Text>
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 15,
              lineHeight: 22,
              marginBottom: 14,
              textAlign: "left",
            }}
          >
            {t("permissions.pulseWhy")}
          </Text>
          <Pressable
            onPress={pulseStatus === "granted" ? undefined : onConnectWatch}
            hitSlop={8}
          >
            <View
              style={{
                borderWidth: 1,
                borderColor: pulseStatus === "granted" ? tokens.accentSoft : tokens.accent,
                borderRadius: 999,
                paddingVertical: 12,
                paddingHorizontal: 20,
                alignSelf: "flex-start",
                opacity: pulseStatus === "granted" ? 0.55 : 1,
              }}
            >
              <Text
                style={{
                  color: pulseStatus === "granted" ? tokens.accentSoft : tokens.accent,
                  fontFamily: fonts.body,
                  fontSize: 15,
                }}
              >
                {pulseStatus === "granted"
                  ? "✓  " + t("permissions.pulseAllow")
                  : t("permissions.pulseAllow")}
              </Text>
            </View>
          </Pressable>
          {pulseStatus === "denied" ? (
            <Pressable
              onPress={() => Linking.openSettings().catch(() => {})}
              hitSlop={6}
              style={{ marginTop: 10 }}
            >
              <Text
                style={{
                  color: tokens.accentSoft,
                  fontFamily: fonts.body,
                  fontSize: 13,
                  textDecorationLine: "underline",
                  textAlign: "left",
                }}
              >
                {t("permissions.pulseDeniedHint")}
              </Text>
            </Pressable>
          ) : null}

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
              textAlign: "left",
            }}
          >
            {t("reminders.sectionLabel")}
          </Text>

          {/* On/off switch — the headline control. Time scroller appears
              below when the switch is on. */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text
              style={{ color: tokens.text, fontFamily: fonts.body, fontSize: 17, textAlign: "left" }}
            >
              {reminder
                ? t("reminders.currentlySet", { time: formatTime(reminder) })
                : t("reminders.notSet")}
            </Text>
            <Switch
              value={reminder !== null}
              onValueChange={(v) => void handleReminderToggle(v)}
              trackColor={{ false: tokens.textMute + "55", true: tokens.accent }}
              accessibilityLabel={t("reminders.toggleLabel")}
            />
          </View>

          {reminder ? (
            Platform.OS === "ios" ? (
              <Pressable
                onPress={() => setIosPickerOpen(true)}
                hitSlop={8}
                style={{ marginTop: 12 }}
              >
                <Text style={{ color: tokens.accent, fontFamily: fonts.body, fontSize: 15 }}>
                  {t("reminders.change")}
                </Text>
              </Pressable>
            ) : (
              <View style={{ marginTop: 12 }}>
                <Pressable onPress={() => setAndroidPickerOpen(true)} hitSlop={8}>
                  <Text style={{ color: tokens.accent, fontFamily: fonts.body, fontSize: 15 }}>
                    {t("reminders.change")}
                  </Text>
                </Pressable>
                {androidPickerOpen ? (
                  <DateTimePicker
                    value={pickerValue()}
                    mode="time"
                    display="default"
                    onChange={handleAndroidPickerChange}
                  />
                ) : null}
              </View>
            )
          ) : null}
        </ScrollView>
      </Animated.View>

      {/* iOS time-picker popover. The spinner commits live on every scroll
          tick (handleInlinePickerChange), so both Done and an outside tap only
          need to dismiss — the selected time is already saved. */}
      {isOpen && Platform.OS === "ios" && iosPickerOpen && reminder ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 2000,
            elevation: 2000,
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
            onPress={() => setIosPickerOpen(false)}
            accessibilityLabel={t("reminders.done")}
          />
          <View
            style={{
              backgroundColor: tokens.bgElev,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 28,
            }}
          >
            <Pressable
              onPress={() => setIosPickerOpen(false)}
              hitSlop={8}
              accessibilityRole="button"
              style={{ alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 4 }}
            >
              <Text style={{ color: tokens.accent, fontFamily: fonts.body, fontSize: 17 }}>
                {t("reminders.done")}
              </Text>
            </Pressable>
            <View style={{ alignItems: "center" }}>
              <DateTimePicker
                value={pickerValue()}
                mode="time"
                display="spinner"
                onChange={handleInlinePickerChange}
                themeVariant="light"
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
