import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector } from "react-native-gesture-handler";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/components/common/ScreenHeader";
import { ForwardCta } from "@/components/common/ForwardCta";
import { ForwardCtaFooter } from "@/components/common/ForwardCtaFooter";
import { Icon } from "@/components/common/Icon";
import { useSwipeForward } from "@/hooks/useSwipeForward";
import * as healthKit from "@/lib/integrations/healthKit";
import * as reminders from "@/lib/integrations/reminders";
import { getClinicalScreeningResult } from "@/lib/storage/storage";
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
          fontSize: 22,
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
  const [pulseStatus, setPulseStatus] = useState<Status>("idle");
  const [notifsStatus, setNotifsStatus] = useState<Status>("idle");
  const [showPicker, setShowPicker] = useState(false);

  // On mount, read real notification permission so the row reflects actual
  // state, not just session-local UI state. Permission is what unlocks
  // Continue; the schedule is a separate (optional) follow-up the picker
  // collects below — granted-without-schedule still counts as granted so a
  // user who allowed in Settings (or in a prior session) isn't stranded.
  // Auto-prompt the picker when there's no schedule yet, so we still nudge
  // them to set a time.
  useEffect(() => {
    void (async () => {
      const status = await reminders.getPermissionStatus();
      if (status === "granted") {
        setNotifsStatus("granted");
        const schedule = await reminders.getSchedule();
        if (!schedule) setShowPicker(true);
      } else if (status === "denied") {
        setNotifsStatus("denied");
      }
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
    if (prior === undefined) {
      router.push("/screening");
    } else {
      router.push("/setup");
    }
  }, [router]);

  const swipeGesture = useSwipeForward(handleContinue);

  const onPulsePress = async () => {
    const status = await healthKit.requestAuthorization();
    // "requested" means the dialog was shown; we can't confirm the outcome.
    // Allow the user to proceed — the pulse hook falls back to mock if denied.
    setPulseStatus(status === "granted" || status === "requested" ? "granted" : "denied");
  };

  const onNotifsPress = async () => {
    const status = await reminders.requestPermission();
    if (status === "granted") {
      // Mark granted immediately. Picking a time is a separate question —
      // if the user dismisses the picker on Android (returns date=undefined),
      // we must NOT leave them blocked from Continue.
      setNotifsStatus("granted");
      setShowPicker(true);
    } else {
      setNotifsStatus("denied");
    }
  };

  const onTimePicked = async (_event: DateTimePickerEvent, date?: Date) => {
    // On Android the picker is a modal that closes itself; on iOS it's inline.
    if (Platform.OS === "android") setShowPicker(false);
    if (!date) return;
    await reminders.setSchedule({ hour: date.getHours(), minute: date.getMinutes() });
    if (Platform.OS === "ios") setShowPicker(false);
  };

  const openSettings = () => {
    Linking.openSettings().catch(() => {});
  };

  const defaultPickerValue = (() => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    return d;
  })();

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <GestureDetector gesture={swipeGesture}>
      <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32 }}
        showsVerticalScrollIndicator={true}
      >
        <ScreenHeader
          paddingX={0}
          left={
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Icon name="arrow-left" size={22} color={tokens.accent} />
            </Pressable>
          }
        />
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

        <PermissionRow
          title={t("permissions.pulseTitle")}
          why={t("permissions.pulseWhy")}
          cta={t("permissions.pulseAllow")}
          status={pulseStatus}
          onPress={onPulsePress}
          deniedHint={t("permissions.pulseDeniedHint")}
          onDeniedPress={openSettings}
        />

        <PermissionRow
          title={t("permissions.notifsTitle")}
          why={t("permissions.notifsWhy")}
          cta={t("permissions.notifsAllow")}
          status={notifsStatus}
          onPress={onNotifsPress}
          deniedHint={t("reminders.enableInSettings") + " →"}
          onDeniedPress={openSettings}
        />

        {showPicker ? (
          <View style={{ marginTop: -16, marginBottom: 12 }}>
            <Text
              style={{
                color: tokens.textMute,
                fontFamily: fonts.body,
                fontSize: 13,
                marginBottom: 8,
                textAlign: "left",
              }}
            >
              {t("reminders.pickTime")}
            </Text>
            <DateTimePicker
              mode="time"
              value={defaultPickerValue}
              onChange={onTimePicked}
              display={Platform.OS === "ios" ? "spinner" : "default"}
            />
          </View>
        ) : null}

        <View className="flex-1" />

        <Text
          style={{
            color: tokens.textMute,
            fontFamily: fonts.body,
            fontSize: 13,
            marginBottom: 24,
            textAlign: "left",
          }}
        >
          {t("permissions.privacy")}
        </Text>
      </ScrollView>

      {/* B-01: clinical screening gate. First-launch users (no stored
          screening result) go through PC-PTSD-5 before Setup; returning
          users skip the questionnaire. The screening route itself routes
          back to /setup (any outcome) — Above-threshold users see a
          clinician-recommendation card first, but it's advisory, not a
          block. See openspec/changes/add-clinical-screening/. Fixed footer
          (outside the ScrollView) so Continue sits at the same screen
          position as Welcome's Begin regardless of how much permission-row
          content is above it. */}
      <ForwardCtaFooter>
        <ForwardCta label={t("permissions.continue")} onPress={handleContinue} />
      </ForwardCtaFooter>
      </View>
      </GestureDetector>
    </SafeAreaView>
  );
}
