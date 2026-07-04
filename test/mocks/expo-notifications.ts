// Shared manual mock for `expo-notifications`.
//
// Opt in per-suite with:
//   jest.mock("expo-notifications", () => require("../../../test/mocks/expo-notifications"));
//   import * as notif from "../../../test/mocks/expo-notifications";
// then call `notif.__reset()` in a beforeEach.
//
// `PermissionStatus` is only used as a TypeScript type in reminders.ts (erased
// at runtime), so the mock needs the runtime functions plus the trigger enum.

export const setNotificationHandler = jest.fn();
export const getPermissionsAsync = jest.fn();
export const requestPermissionsAsync = jest.fn();
export const scheduleNotificationAsync = jest.fn();
export const cancelScheduledNotificationAsync = jest.fn();

export const SchedulableTriggerInputTypes = { DAILY: "daily" };

/** Restore baseline implementations and clear call history. Call in beforeEach. */
export function __reset(): void {
  setNotificationHandler.mockReset();
  getPermissionsAsync.mockReset().mockResolvedValue({ status: "granted" });
  requestPermissionsAsync.mockReset().mockResolvedValue({ status: "granted" });
  scheduleNotificationAsync.mockReset().mockResolvedValue(undefined);
  cancelScheduledNotificationAsync.mockReset().mockResolvedValue(undefined);
}
