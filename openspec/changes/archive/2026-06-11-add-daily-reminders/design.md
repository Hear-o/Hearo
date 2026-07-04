## Context

`expo-notifications` supports both local (device-only) and push (server-driven) notifications. We want **local only** — no backend dependency, no server-side scheduler, no Apple/Google push tokens to manage. The user's device fires the notification at the configured time.

The existing Permissions screen UI is structured around two ask-rows (pulse + reminders); we're keeping that surface, just making the second one functional.

## Goals / Non-Goals

**Goals:**

- One reminder per day, at a single user-chosen time. No "remind me three times". No "remind me on weekdays only".
- The picker is a small inline step inside Permissions, not a separate screen. Lowest friction.
- Re-assert the schedule on app launch defensively, since Android occasionally drops scheduled notifications across reboots or system updates.
- Notification copy is one line, in the user's selected language, with no emoji or urgency.

**Non-Goals:**

- Push notifications. No backend; this is purely local scheduling.
- Multiple reminders or weekday/weekend rules. Adds complexity for marginal benefit.
- Smart timing ("remind me when I haven't walked in 2 days"). Wants session-history persistence which is a separate change.

## Decisions

### Local notifications only

Push would require backend infrastructure we explicitly don't want. Local notifications fire from the OS scheduler regardless of network state and don't need any of the apns/fcm token plumbing.

### Default time = 18:00 local

Matches the "evening walk" framing the rest of the app implies (beach scene default in evening, voice tone is evening). User can change.

### Time picker is a native wheel/dial

Use the platform-native time picker (`@react-native-community/datetimepicker` or whatever `expo-notifications` partners with). Don't reinvent — native picker is familiar and accessible.

### Re-assert schedule on launch

Android occasionally drops scheduled notifications. The app's bootstrap (one of the `useEffect`s in the root layout, or a small `lib/reminders.ts` init function) re-calls `scheduleNotificationAsync` with the persisted config. Idempotent: if the schedule already exists, no duplicate fires.

### Tapping the notification opens to Home

Not to Session directly — that'd ambush the user with a soundscape. Home is the calm entry point that respects the user's intent to start (or not).

## Risks / Trade-offs

- **Risk:** User denies notification permission, but later wants reminders. → **Mitigation:** Standard pattern — show a small "Enable in Settings" link when permission is denied; tap opens the iOS/Android Settings app via `Linking`.
- **Risk:** Time-zone changes (traveling user) shift when the reminder fires. → **Mitigation:** `expo-notifications` schedules in the device's current time zone; this is the right default. If the user is somewhere temporary, they can disable from Permissions.
- **Trade-off:** No weekday/weekend distinction means a daily reminder fires on weekends too. Accepted for v1; bigger scope to make this conditional.
