// Local daily reminder scheduling.
//
// No backend, no push tokens. The user's device fires the notification at
// the configured time via `expo-notifications`. Tap → app opens to Home.
// Schedule is persisted via the lib/storage seam so it survives reboots —
// `reassertSchedule()` is called at app boot to re-register with the OS
// (Android occasionally drops scheduled notifications).

import * as Notifications from "expo-notifications";

import i18n from "@/lib/ui/i18n";
import { getReminderSchedule, ReminderSchedule, setReminderSchedule } from "@/lib/storage/storage";

// Stable identifier for our single daily notification — lets us cancel/replace
// idempotently without leaking duplicates if the user changes their schedule.
const NOTIFICATION_IDENTIFIER = "hearo:daily-reminder";

/** Configure foreground behavior once on app boot. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestPermission(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}

async function scheduleDailyNotification(schedule: ReminderSchedule): Promise<void> {
  // Drop any prior notification with the same identifier so we never end up
  // with duplicates after a schedule change.
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDENTIFIER).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDENTIFIER,
    content: {
      title: i18n.t("reminders.notificationTitle"),
      body: i18n.t("reminders.notificationBody"),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: schedule.hour,
      minute: schedule.minute,
    },
  });
}

/** Set (or replace) the daily reminder. Persists locally and registers with OS. */
export async function setSchedule(schedule: ReminderSchedule): Promise<void> {
  await setReminderSchedule(schedule);
  await scheduleDailyNotification(schedule);
}

/** Clear any configured reminder — both persisted state and OS-scheduled notification. */
export async function clearSchedule(): Promise<void> {
  await setReminderSchedule(null);
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDENTIFIER).catch(() => {});
}

export async function getSchedule(): Promise<ReminderSchedule | null> {
  return getReminderSchedule();
}

/** Boot-time re-assert. Idempotent: if no schedule is stored, nothing happens. */
export async function reassertSchedule(): Promise<void> {
  const schedule = await getReminderSchedule();
  if (!schedule) {
    // Make sure no orphaned OS-scheduled notification survives a config change.
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDENTIFIER).catch(() => {});
    return;
  }
  await scheduleDailyNotification(schedule);
}
