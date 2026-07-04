# Expo SDK 56

This project targets Expo SDK 56 (`expo ~56.0.12` in `package.json`). Read the SDK 56 docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code that touches Expo APIs.

`package.json` is the source of truth for the SDK and all dependency versions. If this doc and `package.json` ever disagree, `package.json` wins — reconcile this doc to it.

## Dev build required (iOS + Android)

This app uses native modules that can't run in any sandboxed runner — `react-native-audio-api` (audio engine), `@kingstinct/react-native-healthkit` (iOS pulse), and others. All on-device work happens against a native build:

- **Local iOS:** `npx expo run:ios`
- **Local Android:** `npx expo run:android`
- **Cloud iOS:** Codemagic builds tagged `ios-v*` → TestFlight
- **Cloud Android:** not wired yet; tracked as a backlog item. Build locally for now.

There is no Expo Go fallback. If something appears to "do nothing" in the audio or pulse paths, you are almost certainly on a build without the native modules linked — re-cut a dev build.

### iOS audio CI (`.github/workflows/ios-audio.yml`)

The Jest suites run against a **fake** AudioContext (`test/mocks/react-native-audio-api.ts`) — they verify our wiring but never that the native engine emits sound. The `iOS audio (device-level)` job closes that gap on every PR to `main`: it prebuilds + natively compiles the audio module, boots a real iOS Simulator, generates a temporary self-test root layout, and runs the in-app audio self-test (`src/devtools/AudioSelfTestScreen.tsx` → `src/lib/audio/audioSelfTest.ts`), which makes the real `react-native-audio-api` engine synthesize a tone and **measures the output** (an `OfflineAudioContext` render + a live `AnalyserNode` tap, asserted non-silent). The verdict is written to `<Documents>/audio-selftest.json` and read back from the simulator's data container.

What it proves: the native audio pipeline builds, links, activates `AVAudioSession`, and produces a real signal on iOS. What it does **not** prove (honest limits of a headless runner): audible playback through real speakers, or HR-driven ducking (the Simulator has no Apple Watch / HealthKit data). If the runner already has BlackHole + ffmpeg wired, a best-effort recording of the simulator's actual output runs as a **non-blocking** diagnostic.

The self-test screen lives outside `src/app`. The workflow rewrites `src/app/_layout.tsx` only in the CI working tree when built with `EXPO_PUBLIC_AUDIO_SELFTEST=1`, so the screen never ships in normal builds.

## Platform parity

- `react-native-audio-api`, `expo-notifications`, `expo-contacts`, `expo-localization`, `expo-file-system`, `expo-router` all work on both platforms; nothing on the JS side should branch on `Platform.OS` unless the underlying behavior actually differs (e.g. iOS DateTimePicker spinner vs Android modal).
- HealthKit is iOS-only. The pulse adapter at `src/lib/integrations/healthKit.ts` is the default platform export (returns "not available"); the iOS implementation lives in `healthKit.ios.ts`. An Android Health Connect adapter would slot in as `healthKit.android.ts`.
- App-level permissions are declared per platform in `app.json` (`ios.infoPlist` keys + `ios.entitlements` for iOS; `android.permissions` for Android when added).
