## Why

The `crisis-access` capability has a complete spec but no working implementation. The `i` glyph is rendered on Session and Home with empty `onPress` handlers, and is missing entirely from Welcome, Permissions, Setup, and After. A user in distress today cannot reach ERAN 1201 through the app — a safety floor we've already committed to in the spec.

This change closes the gap. It is a pure implementation change: the requirements in `openspec/specs/crisis-access/spec.md` already describe the intended behavior, and the work here brings the code in line with them.

## What Changes

- Add a reusable `CrisisAffordance` component (the `i` glyph in the top-left of any screen) that opens the crisis sheet.
- Add a `CrisisSheet` component — a bottom sheet with the non-alarming headline, `call ERAN 1201` primary action (via `tel:1201`), `a person you trust` secondary action (stubbed for v1), and a `close` dismiss.
- Place `CrisisAffordance` on every screen: Welcome, Permissions, Setup, Home, Session, After.
- Wire the affordance on the Session screen to pause the session (audio fade-out + breathing freeze) when tapped, and resume on sheet dismiss without a call.
- Add Hebrew strings for all crisis copy (headline, actions, close).
- Add the EN/HE pulse-control hooks the sheet needs (a shared session-pause channel).

## Capabilities

### New Capabilities

None. This change implements an existing capability.

### Modified Capabilities

- `crisis-access`: adds a small set of new requirements that constrain *how* the implementation works (bilingual parity, sheet animation, affordance z-index). The original requirements are preserved unchanged.

## Impact

- **Affected screens**: all six screens (`ui/src/app/{index,permissions,setup,home,session,after}.tsx`).
- **New components**: `ui/src/components/CrisisAffordance.tsx`, `ui/src/components/CrisisSheet.tsx`.
- **New state**: a tiny Zustand slice or React context tracking whether the session is paused for the sheet, so the Session screen can freeze audio/animation when the sheet opens and resume on dismiss. Adds to `ui/src/lib/session-store.ts` (or a new `crisis-store.ts` if it grows).
- **i18n**: new keys under `crisis.*` already exist in `ui/src/lib/i18n.ts` from the initial scaffold — verify they're complete for both EN and HE.
- **No backend impact.** The crisis sheet must work fully offline and must not generate any telemetry, per `crisis-access` requirement *No backend telemetry on crisis taps*.
- **No new dependencies.** `Linking.openURL("tel:1201")` is built into React Native; no new packages needed.
