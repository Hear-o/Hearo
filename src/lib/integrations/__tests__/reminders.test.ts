jest.mock("expo-notifications", () =>
  require("../../../../test/mocks/expo-notifications"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import * as notif from "../../../../test/mocks/expo-notifications";
import { getReminderSchedule } from "@/lib/storage/storage";
import {
  configureNotificationHandler,
  getPermissionStatus,
  requestPermission,
  setSchedule,
  clearSchedule,
  getSchedule,
  reassertSchedule,
} from "@/lib/integrations/reminders";

// Mirrors the private identifier in reminders.ts — the single, stable id we use
// so cancel/replace stays idempotent.
const NOTIFICATION_IDENTIFIER = "hearo:daily-reminder";

beforeEach(async () => {
  await AsyncStorage.clear();
  notif.__reset();
});

describe("reminders / configureNotificationHandler", () => {
  it("registers a foreground handler that shows banners without sound", async () => {
    configureNotificationHandler();
    expect(notif.setNotificationHandler).toHaveBeenCalledTimes(1);

    const handler = notif.setNotificationHandler.mock.calls[0][0].handleNotification;
    await expect(handler()).resolves.toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    });
  });
});

describe("reminders / permission helpers", () => {
  it("reads the current permission status", async () => {
    notif.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    expect(await getPermissionStatus()).toBe("granted");
  });

  it("requests permission and returns the new status", async () => {
    notif.requestPermissionsAsync.mockResolvedValue({ status: "denied" });
    expect(await requestPermission()).toBe("denied");
  });
});

describe("reminders / setSchedule", () => {
  it("persists the schedule and registers a DAILY notification", async () => {
    await setSchedule({ hour: 9, minute: 30 });

    expect(await getReminderSchedule()).toEqual({ hour: 9, minute: 30 });
    // Cancels any prior notification before scheduling, to stay idempotent.
    expect(notif.cancelScheduledNotificationAsync).toHaveBeenCalledWith(NOTIFICATION_IDENTIFIER);
    expect(notif.scheduleNotificationAsync).toHaveBeenCalledTimes(1);

    const arg = notif.scheduleNotificationAsync.mock.calls[0][0];
    expect(arg.identifier).toBe(NOTIFICATION_IDENTIFIER);
    expect(arg.trigger).toEqual({
      type: notif.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 30,
    });
    expect(typeof arg.content.title).toBe("string");
    expect(typeof arg.content.body).toBe("string");
  });

  it("swallows a failure to cancel the prior notification", async () => {
    notif.cancelScheduledNotificationAsync.mockRejectedValueOnce(new Error("nothing to cancel"));
    await expect(setSchedule({ hour: 7, minute: 0 })).resolves.toBeUndefined();
    expect(notif.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });
});

describe("reminders / clearSchedule", () => {
  it("clears stored state and cancels the OS notification", async () => {
    await setSchedule({ hour: 9, minute: 30 });
    notif.cancelScheduledNotificationAsync.mockClear();

    await clearSchedule();

    expect(await getReminderSchedule()).toBeNull();
    expect(notif.cancelScheduledNotificationAsync).toHaveBeenCalledWith(NOTIFICATION_IDENTIFIER);
  });
});

describe("reminders / getSchedule", () => {
  it("returns the stored schedule", async () => {
    await setSchedule({ hour: 6, minute: 15 });
    expect(await getSchedule()).toEqual({ hour: 6, minute: 15 });
  });

  it("returns null when none is stored", async () => {
    expect(await getSchedule()).toBeNull();
  });
});

describe("reminders / reassertSchedule", () => {
  it("re-registers the notification when a schedule is stored", async () => {
    await setSchedule({ hour: 8, minute: 0 });
    notif.scheduleNotificationAsync.mockClear();

    await reassertSchedule();

    expect(notif.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it("cancels any orphaned notification when no schedule is stored", async () => {
    await reassertSchedule();

    expect(notif.cancelScheduledNotificationAsync).toHaveBeenCalledWith(NOTIFICATION_IDENTIFIER);
    expect(notif.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
