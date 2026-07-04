# ADR-002: Replace react-native-health with @kingstinct/react-native-healthkit

- **Status**: proposed
- **Date**: 2026-06-12
- **Deciders**:
- **Tags**: ios, healthkit, expo, native-modules, ci

## Context

Hearo reads Apple Health heart-rate samples on iOS so the session experience can
soften when the user's body shows elevated stress. The app targets Expo SDK 56
with React Native 0.85.3 and uses a development/native build; Expo Go is not a
supported runtime for HealthKit or the audio engine.

The current implementation depends on `react-native-health@1.19.0` and isolates
that dependency behind `src/lib/healthKit.ios.ts`. The app only needs a small
HealthKit surface:

1. Check whether HealthKit is available.
2. Request read authorization for heart-rate samples.
3. Read recent heart-rate samples while a session is active.

The current dependency has become a build risk. Codemagic's iOS archive failed
while compiling `RCTAppleHealthKit.m` from `react-native-health`. The failure is
consistent with that package's legacy `RCTCallableJSModules` bridge setup:
`self.callableJSModules = ...` followed by `[self.callableJSModules
setBridge:self.bridge]`. In React Native 0.85, `setBridge:` is guarded behind
legacy architecture support, so this native code is not a stable fit for the
current app stack.

There is no newer `react-native-health` npm release to upgrade to. A local
postinstall patch can unblock CI, but it leaves the app dependent on a stale
native module and creates maintenance risk around every install, prebuild, and
React Native upgrade.

## Decision

Replace `react-native-health` with `@kingstinct/react-native-healthkit` and its
required peer dependency `react-native-nitro-modules`.

The migration should keep the rest of the app behind the existing
`src/lib/healthKit.ios.ts` adapter. Callers should continue using the local
HealthKit abstraction rather than importing the vendor package directly.

The implementation should:

1. Remove `react-native-health` from `package.json` and `package-lock.json`.
2. Add `@kingstinct/react-native-healthkit` and `react-native-nitro-modules`.
3. Replace the `react-native-health` config plugin in `app.json` with
   `@kingstinct/react-native-healthkit`, preserving the existing HealthKit
   permission copy.
4. Rewrite `src/lib/healthKit.ios.ts` against the Kingstinct API while keeping
   the existing exported functions and privacy behavior.
5. Update HealthKit tests and mocks to cover authorization, unavailable
   HealthKit, sample polling/subscription, and unsubscribe behavior.
6. Remove any temporary `react-native-health` patch script or postinstall hook.
7. Validate with Jest, Expo prebuild, CocoaPods install, and a Codemagic iOS
   archive before marking this ADR accepted.

## Alternatives Considered

### Keep react-native-health and patch it after install

This is the smallest tactical fix. It can be implemented with `patch-package` or
a custom postinstall script and may unblock the immediate App Store build.

Rejected as the target architecture because it preserves a stale native
dependency and relies on mutating `node_modules` after every install.

### Fork react-native-health

A fork would avoid a postinstall patch and keep the existing JS API mostly
unchanged.

Rejected because Hearo would own a native module fork for a narrow HealthKit
surface. That creates ongoing maintenance work without improving the app's
HealthKit abstraction.

### Build a custom Expo native module

This gives maximum control and could expose exactly the HealthKit calls Hearo
needs.

Rejected for now because it is more implementation and maintenance work than the
current product needs. It remains a future option if third-party HealthKit
libraries become unreliable.

### Replace with @kingstinct/react-native-healthkit

Chosen because it is actively oriented toward modern React Native, Expo config
plugins, Promise-based APIs, TypeScript, and broad HealthKit coverage. The main
tradeoff is adding Nitro Modules as a native dependency.

## Consequences

### Positive

- Removes the `RCTCallableJSModules` compile failure path from
  `react-native-health`.
- Removes the need for a postinstall patch against `node_modules`.
- Moves the app to a more modern, Promise-based HealthKit API.
- Keeps HealthKit vendor churn contained inside the existing adapter.
- Reduces stale transitive dependency exposure from `react-native-health`.

### Negative

- Adds `react-native-nitro-modules`, which must compile cleanly in the Expo SDK
  56 / React Native 0.85.3 / Xcode 26 Codemagic environment.
- Requires a real native rebuild; Expo Go still cannot be used.
- Requires migration work in tests and mocks.
- Introduces a different vendor API with different authorization and query
  behavior that must be verified on device.

### Neutral

- The HealthKit entitlement and App Store capability requirements remain.
- Heart-rate data must remain local-only; this decision does not introduce any
  network sync or analytics around health samples.
- Simulator testing can validate build and mocked flows, but Apple Watch
  heart-rate behavior requires a physical iPhone/Watch setup or TestFlight.

## Rollout Plan

1. Implement the dependency and adapter migration in a focused branch.
2. Run `npm test -- --runInBand`.
3. Run `npx expo prebuild --platform ios --non-interactive --clean`.
4. Run `cd ios && pod install` on macOS or in Codemagic.
5. Run the Codemagic iOS App Store workflow and confirm the archive reaches the
   upload/publishing phase.
6. Perform a device smoke test:
   - HealthKit permission prompt appears with the expected copy.
   - Denying permission leaves the app in mock/fallback pulse behavior.
   - Granting permission allows heart-rate samples to drive pulse updates.
   - Leaving a session unsubscribes from HealthKit updates.
7. Mark this ADR accepted only after the CI archive and device smoke test pass.

## Links

- `src/lib/healthKit.ios.ts` - current HealthKit adapter
- `openspec/changes/wire-healthkit-pulse/` - HealthKit pulse change context
- `app.json` - HealthKit config plugin and iOS permission copy
- `codemagic.yaml` - iOS archive and App Store workflow
- `@kingstinct/react-native-healthkit` installation docs: https://kingstinct-react-native-healthkit.mintlify.app/installation
- `react-native-health` npm package: https://www.npmjs.com/package/react-native-health
