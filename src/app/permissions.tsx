import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { OnboardingBreadcrumb } from "@/components/common/OnboardingBreadcrumb";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { ForwardCta } from "@/components/common/ForwardCta";
import { ForwardCtaFooter } from "@/components/common/ForwardCtaFooter";
import { Icon } from "@/components/common/Icon";
import { NameTextInput } from "@/components/common/NameTextInput";
import * as healthKit from "@/lib/integrations/healthKit";
import * as reminders from "@/lib/integrations/reminders";
import { usePageFade } from "@/lib/ui/fadeTransition";
import {
  getClinicalScreeningResult,
  getReminderTime,
  ReminderSchedule,
  setReminderTime,
} from "@/lib/storage/storage";
import { useNameDraft } from "@/lib/ui/displayName";
import { fonts, tokens } from "@/lib/ui/tokens";

type Status = "idle" | "granted" | "denied";

function PermissionRow({
  title,
  why,
  cta,
  status,
  onPress,
  deniedHint,
  onDeniedPress,
}: {
  title: string;
  why: string;
  cta: string;
  status: Status;
  onPress: () => void;
  deniedHint?: string;
  onDeniedPress?: () => void;
}) {
  const granted = status === "granted";
  const denied = status === "denied";
  return (
    <View className="mb-12">
      <Text
        style={{
          color: tokens.text,
          fontFamily: fonts.display,
          fontSize: 28,
          marginBottom: 8,
          textAlign: "left",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: tokens.textMute,
          fontFamily: fonts.body,
          fontSize: 15,
          lineHeight: 22,
          marginBottom: 16,
          textAlign: "left",
        }}
      >
        {why}
      </Text>
      <Pressable onPress={granted ? undefined : onPress} hitSlop={8}>
        <View
          style={{
            borderWidth: 1,
            borderColor: granted ? tokens.accentSoft : tokens.accent,
            borderRadius: 999,
            paddingVertical: 12,
            paddingHorizontal: 20,
            alignSelf: "flex-start",
            opacity: granted ? 0.55 : 1,
          }}
        >
          <Text
            style={{
              color: granted ? tokens.accentSoft : tokens.accent,
              fontFamily: fonts.body,
              fontSize: 15,
            }}
          >
            {granted ? "✓  " + cta : cta}
          </Text>
        </View>
      </Pressable>
      {denied && deniedHint ? (
        <Pressable onPress={onDeniedPress} hitSlop={6} style={{ marginTop: 10 }}>
          <Text
            style={{
              color: tokens.accentSoft,
              fontFamily: fonts.body,
              fontSize: 13,
              textDecorationLine: "underline",
            }}
          >
            {deniedHint}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function Permissions() {
  const router = useRouter();
  const { t } = useTranslation();
  const { animatedStyle, transition } = usePageFade();
  const [pulseStatus, setPulseStatus] = useState<Status>("idle");
  const [notifsStatus, setNotifsStatus] = useState<Status>("idle");

  // Reminder toggle state — same shape as SettingsSheet's Switch + popover.
  const [reminder, setReminder] = useState<ReminderSchedule | null>(null);
  const [lastTime, setLastTime] = useState<ReminderSchedule | null>(null);
  const [androidPickerOpen, setAndroidPickerOpen] = useState(false);
  const [iosPickerOpen, setIosPickerOpen] = useState(false);

  const nameDraft = useNameDraft();

  // On mount, read real notification permission so the row reflects actual
  // state, not just session-local UI state. Permission is what unlocks
  // Continue; the schedule is a separate (optional) follow-up the toggle
  // collects below — granted-without-schedule still counts as granted so a
  // user who allowed in Settings (or in a prior session) isn't stranded.
  useEffect(() => {
    void (async () => {
      const status = await reminders.getPermissionStatus();
      if (status === "granted") {
        setNotifsStatus("granted");
      } else if (status === "denied") {
        setNotifsStatus("denied");
      }
      void reminders.getSchedule().then(setReminder);
      void getReminderTime().then(setLastTime);
      const hkStatus = await healthKit.getAuthorizationStatus();
      if (hkStatus === "granted" || hkStatus === "requested") setPulseStatus("granted");
    })();
  }, []);

  // Both pulse and notifications are optional. Pulse falls through to the
  // mock generator when HealthKit / Health Connect isn't granted; notifications
  // are a nice-to-have for daily reminders, not load-bearing.
  //
  // v1.0.4 regression: a `if (!canContinue) return;` here blocked Android
  // entirely (HealthKit is iOS-only — pulseStatus is always "denied" on
  // Android, so canContinue was forever false). Continue is now always
  // enabled; users who skip either prompt land on the next screen and the
  // app degrades gracefully.

  const handleContinue = useCallback(async () => {
    const prior = await getClinicalScreeningResult();
    transition(() => router.push(prior === undefined ? "/screening" : "/setup"));
  }, [router, transition]);

  const onPulsePress = async () => {
    const status = await healthKit.requestAuthorization();
    // "requested" means the dialog was shown; we can't confirm the outcome.
    // Allow the user to proceed — the pulse hook falls back to mock if denied.
    setPulseStatus(status === "granted" || status === "requested" ? "granted" : "denied");
  };

  const openSettings = () => {
    Linking.openSettings().catch(() => {});
  };

  function defaultReminderTime(): ReminderSchedule {
    return { hour: 9, minute: 0 };
  }

  async function commitTime(date: Date) {
    const next: ReminderSchedule = { hour: date.getHours(), minute: date.getMinutes() };
    await reminders.setSchedule(next);
    await setReminderTime(next);
    setReminder(next);
    setLastTime(next);
  }

  async function handleReminderToggle(next: boolean) {
    if (next) {
      const status = await reminders.requestPermission();
      if (status !== "granted") {
        setNotifsStatus("denied");
        return;
      }
      setNotifsStatus("granted");
      const initial = reminder ?? lastTime ?? defaultReminderTime();
      await reminders.setSchedule(initial);
      await setReminderTime(initial);
      setReminder(initial);
      setLastTime(initial);
      if (Platform.OS === "ios") setIosPickerOpen(true);
    } else {
      await reminders.clearSchedule();
      setReminder(null);
      setIosPickerOpen(false);
    }
  }

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

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1">
      {/* Fixed above the ScrollView so the crisis affordance stays reachable
          while scrolling instead of scrolling out of view. */}
      <ScreenHeader
        left={
          <Pressable onPress={() => transition(() => router.back())} hitSlop={12}>
            <Icon name="arrow-left" size={22} color={tokens.accent} />
          </Pressable>
        }
        bottom={<OnboardingBreadcrumb step="permissions" />}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32 }}
        showsVerticalScrollIndicator={true}
      >
        <View className="pt-4">
          <View style={{ width: 28, height: 1, backgroundColor: tokens.accent }} />
        </View>

        <Text
          style={{
            color: tokens.text,
            fontFamily: fonts.display,
            fontSize: 30,
            lineHeight: 40,
            marginTop: 24,
            marginBottom: 40,
            textAlign: "left",
          }}
        >
          {t("permissions.title")}
        </Text>

        <View className="mb-12">
          <Text
            style={{
              color: tokens.text,
              fontFamily: fonts.display,
              fontSize: 28,
              marginBottom: 8,
              textAlign: "left",
            }}
          >
            {t("setup.nameQuestion")}
          </Text>
          <NameTextInput
            value={nameDraft.value}
            onChangeText={nameDraft.onChangeText}
            onBlur={nameDraft.onBlur}
            style={{ marginBottom: 6 }}
          />
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 15,
              lineHeight: 18,
              textAlign: "left",
            }}
          >
            {t("setup.nameHint")}
          </Text>
        </View>

        <PermissionRow
          title={t("permissions.pulseTitle")}
          why={t("permissions.pulseWhy")}
          cta={t("permissions.pulseAllow")}
          status={pulseStatus}
          onPress={onPulsePress}
          deniedHint={t("permissions.pulseDeniedHint")}
          onDeniedPress={openSettings}
        />

        <View className="mb-12">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: tokens.text,
                fontFamily: fonts.display,
                fontSize: 28,
                textAlign: "left",
                flexShrink: 1,
              }}
            >
              {t("permissions.notifsTitle")}
            </Text>
            <Switch
              value={reminder !== null}
              onValueChange={(v) => void handleReminderToggle(v)}
              trackColor={{ false: tokens.textMute + "55", true: tokens.accent }}
              accessibilityLabel={t("reminders.toggleLabel")}
            />
          </View>
          <Text
            style={{
              color: tokens.textMute,
              fontFamily: fonts.body,
              fontSize: 15,
              lineHeight: 22,
              textAlign: "left",
            }}
          >
            {t("permissions.notifsWhy")}
          </Text>

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

          {notifsStatus === "denied" ? (
            <Pressable onPress={openSettings} hitSlop={6} style={{ marginTop: 10 }}>
              <Text
                style={{
                  color: tokens.accentSoft,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  textDecorationLine: "underline",
                }}
              >
                {t("reminders.enableInSettings") + " →"}
              </Text>
            </Pressable>
          ) : null}
        </View>

      </ScrollView>

      {/* B-01: clinical screening gate. First-launch users (no stored
          screening result) go through PC-PTSD-5 before Setup; returning
          users skip the questionnaire. The screening route itself routes
          back to /setup (any outcome) — Above-threshold users see a
          clinician-recommendation card first, but it's advisory, not a
          block. See openspec/changes/add-clinical-screening/. Fixed footer
          (outside the ScrollView) so Continue sits at the same screen
          position as Welcome's Begin regardless of how much permission-row
          content is above it. The privacy note lives here too, not in the
          ScrollView — that content already overflows the viewport on most
          devices, so a trailing margin there has no slack to move into and
          silently does nothing (see the marginBottom-doesn't-move-it bug this
          fixed). Anchoring it to this fixed, non-flex footer instead gives it
          a real, deterministic gap above Continue, regardless of scroll
          state, without affecting Continue's own position. */}
      <ForwardCtaFooter>
        <Text
          style={{
            color: tokens.textMute,
            fontFamily: fonts.body,
            fontSize: 13,
            marginBottom: 16,
            textAlign: "left",
          }}
        >
          {t("permissions.privacy")}
        </Text>
        <ForwardCta label={t("permissions.continue")} onPress={handleContinue} />
      </ForwardCtaFooter>

      {/* iOS time-picker popover, same pattern as SettingsSheet: the spinner
          commits live on every scroll tick, so Done and the backdrop tap only
          need to dismiss. */}
      {Platform.OS === "ios" && iosPickerOpen && reminder ? (
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
    </SafeAreaView>
    </Animated.View>
  );
}
