## Why

The whole therapeutic story of HearO rests on the pulse being real — the auto-soften logic, the "the app watches your body even when you can't reach for the phone" promise, the privacy stance that the pulse stream stays on-device. Today the pulse is a mocked phase-driven curve. This change wires Apple Watch heart rate via HealthKit (and Android Health Connect as a follow-up surface) so the demo actually does what we keep saying it does.

It is the single highest-impact change remaining for the demo. Three of the four scenarios in the `exposure-session` capability spec ("Pulse spike", "Pulse normalizes after spike", "Watch present") are currently only deterministic-by-mock; this change makes them deterministic-by-reality.

## What Changes

- The Session screen consumes live heart-rate from Apple Watch via HealthKit (`expo-health` or `react-native-health` — see design.md for the choice).
- The auto-soften logic that runs during the `during` and `calming` phases is now driven by the *actual* pulse rather than the script's `pulsePhase` field.
- The on-device privacy stance holds: pulse samples never leave the device during a session; only the per-session sparkline gets persisted locally at session end (no backend, per the local-first direction).
- Permission for HealthKit is the existing "Allow Apple Health" button on the Permissions screen, which today flips a UI state to "granted" without actually asking. That ask becomes real.
- Falls back gracefully to the mocked generator when no watch is paired or permission is denied — the session is still runnable, just without the auto-soften behavior being tied to the user's real body.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `exposure-session` — the existing requirement "Continuous pulse display" already accounts for HealthKit-when-available and mock-otherwise; this change implements the HealthKit branch for real and tightens the failure-mode requirements (what happens when permission is denied, when the watch disconnects mid-session, when HealthKit returns no data for the past N seconds).

## Impact

- **New dependency**: `expo-health` (preferred — Expo-managed) or `react-native-health` (older but more battle-tested). Choice rationale in design.md.
- **New file**: `src/lib/healthKit.ts` — wraps the chosen library. Exposes `requestAuthorization()`, `subscribeHeartRate(callback)` returning an unsubscribe handle, `getMostRecentSample()`.
- **Edited**: `src/lib/pulse.ts` — the existing `usePulse` hook becomes a router: if HealthKit is available and authorized, it subscribes to the real stream; otherwise it falls back to the existing mock generator. Call sites in `src/app/session.tsx` don't change.
- **Edited**: `src/app/permissions.tsx` — the "Allow Apple Health" button calls the real authorization flow.
- **app.json**: adds the `NSHealthShareUsageDescription` (iOS) and HealthKit entitlement. Android Health Connect adds its own manifest entries (deferred to a follow-up if scope grows).
- **No backend changes.** Per the privacy stance, pulse stays on-device.

### Apple-account dependency

This change introduces the HealthKit entitlement which Apple requires for HealthKit-reading apps. Submitting to the App Store needs the Apple Developer Program account — already a known dependency for any iOS production distribution. Dev-time testing in Expo Go works without the entitlement for some reads but a development build (`eas build --profile development`) is the realistic test surface.
