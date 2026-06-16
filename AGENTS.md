# Expo SDK 56

This project targets Expo SDK 56 (`expo ~56.0.8` in `package.json`). Read the SDK 56 docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code that touches Expo APIs.

`package.json` is the source of truth for the SDK and all dependency versions. If this doc and `package.json` ever disagree, `package.json` wins — reconcile this doc to it.

## Dev build / TestFlight only

This app uses native modules that can't run in any sandboxed runner — `react-native-audio-api` (audio engine), `@kingstinct/react-native-healthkit` (pulse), and others. All on-device work happens against a native build:

- Local: `npx expo run:ios` or `npx expo run:android`
- Cloud: EAS / Codemagic build → TestFlight (the standard QA path)

There is no Expo Go fallback. If something appears to "do nothing" in the audio or HealthKit paths, you are almost certainly on a build without the native modules linked — re-cut a dev build.
