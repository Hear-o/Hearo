## 1. Dependency + native config

- [x] 1.1 `npx expo install expo-notifications @react-native-community/datetimepicker`
- [x] 1.2 Add `expo-notifications` to `app.json` plugins with notification icon + color
- [ ] 1.3 Wire deep link: tapping a notification navigates via expo-router to `/home` — DEFERRED to a follow-up commit. Today the OS auto-opens the app on tap (default behavior); routing to `/home` specifically requires a `Notifications.useLastNotificationResponse()` listener wired to `expo-router`'s `router.replace("/home")`. Small addition, not blocking core flow.

## 2. Storage + adapter

- [x] 2.1 Add `reminderSchedule` key (`{ hour, minute } | null`) to `src/lib/storage.ts`
- [x] 2.2 Create `src/lib/reminders.ts`:
  - `requestPermission()` → permission status
  - `setSchedule({ hour, minute })` — schedules + persists
  - `clearSchedule()` — cancels + clears persistence
  - `getSchedule()` — reads persisted schedule
  - `reassertSchedule()` — idempotent re-assert called at app boot
  - Plus `configureNotificationHandler()` for foreground behavior + `getPermissionStatus()` for current state.

## 3. Permissions screen wiring

- [x] 3.1 Replace the placeholder "Allow" handler with real `reminders.requestPermission()`
- [x] 3.2 On permission grant, show the time picker; on confirm, call `setSchedule()`
- [x] 3.3 Show "Enable in Settings →" deep link (via `Linking.openSettings()`) when permission is denied
- [x] 3.4 Reflect actual permission + schedule state in the row's "granted" indicator — reads `getPermissionStatus()` + `getSchedule()` on mount

## 4. Boot-time re-assert

- [x] 4.1 In `src/app/_layout.tsx`, call `reminders.reassertSchedule()` after fonts are loaded; also call `configureNotificationHandler()` at module load for foreground behavior

## 5. i18n

- [x] 5.1 New keys under `reminders.*`: `pickTime`, `confirm`, `notificationTitle`, `notificationBody`, `enableInSettings` — EN + HE per the spec

## 6. Verification

- [x] 6.1 `npx tsc --noEmit` clean
- [x] 6.2 `npx expo export --platform web` bundles
- [ ] 6.3 Manual on device: grant permission, set time 2 min in the future, confirm notification fires, confirm tap opens Home — deferred until tested on device
- [ ] 6.4 Manual: deny permission, confirm Settings deep link works — deferred until tested on device
- [ ] 6.5 Manual: reboot device (Android), confirm reminder still fires next day — deferred until tested on device
- [x] 6.6 `npx -y @fission-ai/openspec validate add-daily-reminders` passes
