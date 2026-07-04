## Context

The Session screen drives all of its dynamic behavior off `usePulse({ active, phase })` in `src/lib/pulse.ts`. Today that hook generates a phase-keyed curve with jitter. The hook's *signature* is exactly what we want for a real-pulse implementation; only the body changes.

The auto-soften behavior in `src/app/session.tsx` reads `pulsePhase` (a script-driven state), not the actual pulse number. To make this change therapeutically meaningful, the auto-soften threshold must move from "the script says we're in the peak phase" to "the pulse is actually above the user's threshold." That's the substantive shift this change makes.

## Goals / Non-Goals

**Goals:**

- Live heart-rate from Apple Watch via HealthKit drives the Session screen's pulse number AND the auto-soften decision.
- Mocked pulse remains the fallback path so demos without a paired watch still run.
- The pulse stream is purely on-device. No samples cross the network during a session. The per-session sparkline persisted at session end stays on-device too (via the existing `lib/storage.ts` seam).
- The Permissions screen's "Allow Apple Health" button does what it says.

**Non-Goals:**

- Android Health Connect in this PR. Apple Watch + iPhone is the demo target. Android handling can be a follow-up.
- A bring-your-own-data model where users upload Garmin / Fitbit / Polar data. HealthKit only.
- Personalized thresholds (per-user baseline HR, fitness-derived ceilings). Same hardcoded 105 bpm threshold as today; that's a separate change.

## Decisions

### Library choice: `@kingstinct/react-native-healthkit`

`expo-health` (the original preferred choice) turned out to be an npm placeholder with no real implementation, and `react-native-health` was considered but replaced. We use `@kingstinct/react-native-healthkit` (Kingstinct/Software Mansion), a Nitro-modules–based Swift wrapper with first-class TypeScript types and an Expo config plugin.

The adapter in `src/lib/healthKit.ios.ts` isolates all Kingstinct types so call sites (the pulse hook, permissions screen) remain library-agnostic. Background delivery is explicitly disabled in `app.json` since the adapter uses foreground polling, not `HKObserverQuery`.

### Auto-soften threshold is now real

`src/app/session.tsx` currently derives `slow = pulsePhase === "peak" || pulsePhase === "settling"`, where `pulsePhase` comes from the timeline `SCRIPT`. That's a stage-driven decision, not a body-driven one.

After this change, `slow` is computed from the actual pulse: above 105 bpm for at least 2 consecutive samples (~500ms) → enter slow state. Below 90 bpm for at least 3 consecutive samples → exit slow state. The hysteresis (105 in / 90 out) avoids flapping.

### Failure-mode defaults

Real HealthKit streams have failure modes the mock didn't:

- **No watch paired:** the subscription returns immediately with no samples. → Fall back to mock generator. The user still sees a moving pulse number, just script-driven.
- **Permission denied:** same as above.
- **Watch disconnects mid-session:** the stream goes quiet. After 10 seconds of no samples, we treat the session as having lost the watch and quietly fall back to mock (without disrupting the session). A small `text-mute` indicator in the corner shows "watch disconnected" if we want — but keeping the visual quiet is more on-brand.
- **First sample takes >5s after subscribe:** show the last-known number or a placeholder; don't render `--`.

### Privacy stance preserved

The session's pulse stream is consumed in memory in `usePulse` and used for the slow-state computation. We never POST it anywhere — `lib/api.ts` doesn't exist, the Supabase migration is paused. The per-session sparkline persisted at session end via `lib/storage.ts` keeps the data on-device.

## Risks / Trade-offs

- **Risk:** Expo Go cannot grant HealthKit entitlements; testing requires a dev build (`eas build --profile development`). → **Mitigation:** The mock fallback means we keep developing in Expo Go for everything except real-pulse verification; we cut a dev build when we want to test the HealthKit path specifically. CI already supports this via the existing `eas build` plumbing.
- **Risk:** Apple's HealthKit permission UX is a separate sheet that interrupts onboarding. → **Mitigation:** The user already grants pulse permission on the Permissions screen — they expect it. Our "Allow Apple Health" copy frames why.
- **Trade-off:** Threshold values (105 in / 90 out) are still hardcoded. Real personalization (age-derived, baseline-HR-derived) is a separate change. Accepted for this PR.
- **Trade-off:** No Android equivalent in this PR. Android demo path falls back to mock until Health Connect lands. Accepted; the team's primary demo device is iOS.

## Migration plan

No data migration. The auto-soften logic's source moves from `pulsePhase` to real pulse, which is observable behavior. Rollback = revert the change to `session.tsx`; the mock generator remains intact behind the fallback path.
