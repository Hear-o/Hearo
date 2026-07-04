## Why

The Permissions screen offers a "Reminders" allow button that does nothing — it flips a local UI state from `idle` to `granted` and that's the end of it. No notification permission is actually requested, no schedule is set, no notification ever fires. This change wires it for real, using `expo-notifications` to schedule a local daily reminder on the device. No backend involved — fits the local-first direction.

## What Changes

- Tapping "Allow" on the Reminders row triggers the real iOS/Android notification permission prompt.
- A small follow-up step lets the user pick a time of day for the daily reminder. Default suggestion: 18:00 local (evening — matches the most common scene default).
- The schedule is stored locally and re-asserted on app launch (Android occasionally drops scheduled notifications across reboots).
- Notification copy: *"a quiet walk is ready when you are."* / Hebrew: *"הליכה שקטה מחכה לך כשתהיה מוכן."* Single line, no emoji, no urgency.
- Tapping the notification opens the app to the Home screen.

## Capabilities

### New Capabilities

- `daily-reminders`: schedules a single local daily notification at a user-chosen time. Permission, scheduling, copy, and on-launch re-assertion all live in this capability.

### Modified Capabilities

None.

## Impact

- **New dependency**: `expo-notifications`.
- **New file**: `src/lib/reminders.ts` — wraps `expo-notifications` with `requestPermission()`, `setSchedule({ hour, minute })`, `clearSchedule()`, `getSchedule()`. Persists schedule via the existing `lib/storage.ts` seam.
- **Edited**: `src/app/permissions.tsx` — the existing Reminders row now asks for real permission and shows the time-picker step. The display of "granted" reflects actual permission + a configured schedule.
- **New i18n**: keys for the time picker prompt, notification title/body, and the time-of-day picker labels.
- **app.json**: notification icon + color for Android, `UIBackgroundModes` not needed (we're using local notifications, not push). The `expo-notifications` plugin entry handles native config.
- **No backend.** All scheduling is local. Notifications fire while the device is offline.
