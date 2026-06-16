# Expo SDK 56

This project targets Expo SDK 56 (`expo ~56.0.8` in `package.json`). Read the SDK 56 docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code that touches Expo APIs.

`package.json` is the source of truth for the SDK and all dependency versions. If this doc and `package.json` ever disagree, `package.json` wins — reconcile this doc to it.

## Dev build required (iOS + Android)

This app uses native modules that can't run in any sandboxed runner — `react-native-audio-api` (audio engine), `@kingstinct/react-native-healthkit` (iOS pulse), and others. All on-device work happens against a native build:

- **Local iOS:** `npx expo run:ios`
- **Local Android:** `npx expo run:android`
- **Cloud iOS:** Codemagic builds tagged `ios-v*` → TestFlight
- **Cloud Android:** not wired yet; tracked as a backlog item. Build locally for now.

There is no Expo Go fallback. If something appears to "do nothing" in the audio or pulse paths, you are almost certainly on a build without the native modules linked — re-cut a dev build.

## Platform parity

- `react-native-audio-api`, `expo-notifications`, `expo-contacts`, `expo-localization`, `expo-file-system`, `expo-router` all work on both platforms; nothing on the JS side should branch on `Platform.OS` unless the underlying behavior actually differs (e.g. iOS DateTimePicker spinner vs Android modal).
- HealthKit is iOS-only. The pulse adapter at `src/lib/integrations/healthKit.ts` is the default platform export (returns "not available"); the iOS implementation lives in `healthKit.ios.ts`. An Android Health Connect adapter would slot in as `healthKit.android.ts`.
- App-level permissions are declared per platform in `app.json` (`ios.infoPlist` keys + `ios.entitlements` for iOS; `android.permissions` for Android when added).
