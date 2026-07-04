## Context

The mobile UI scaffold ships with the `i` glyph rendered in two screens (Session and Home) but wired to a no-op handler. The `crisis-access` capability spec describes the intended behavior in full — an offline-capable bottom sheet that surfaces ERAN 1201 and a trusted-contact stub from any screen, with the Session screen pausing rather than ending when the sheet opens.

Constraints:

- **Bilingual.** UI must work in both English and Hebrew, with RTL layout in Hebrew.
- **Offline.** No network calls, no remote assets. The sheet must open and the `tel:` link must work even with airplane mode on.
- **Privacy.** No telemetry on crisis taps. No backend awareness of the sheet's existence.
- **Hackathon timeline.** Implementation lands in a single sitting; no new dependencies if avoidable.

The codebase already uses Zustand for state (`ui/src/lib/session-store.ts`), React Native's `Linking` for URI handling (already imported in Expo), and Reanimated for animations. No new packages should be needed.

## Goals / Non-Goals

**Goals:**

- The `i` glyph appears in the same top-left position on all six screens.
- A single tap anywhere opens the crisis sheet within 200ms.
- Primary action launches the iOS dialer with `1201` prefilled via `tel:1201`.
- Secondary action (`a person you trust`) opens a stub that explains how to add contacts later — v1 does not implement the contact list itself.
- On the Session screen, opening the sheet pauses the session (audio fade-out, breathing freeze); dismissing the sheet resumes the session from where it paused; tapping the call action does NOT end the session, it just paused.
- All copy localized; RTL layout flows correctly in Hebrew.

**Non-Goals:**

- Storing or syncing trusted contacts (deferred — the spec already calls out the stub fallback).
- A full settings flow for crisis preferences (e.g. choosing a default hotline number — ERAN 1201 is hardcoded for v1).
- Telemetry or analytics on crisis interactions (explicitly forbidden by the spec).
- Push notification or background-state crisis flows.

## Decisions

### Centralize the affordance in a single component, not per-screen JSX

Each screen currently renders its top row inline. Adding the affordance per-screen means six near-identical `<Pressable><Text>i</Text></Pressable>` blocks plus six identical `onPress` wirings. We introduce `<CrisisAffordance />` as a single component that handles the glyph styling, hit area, and open-sheet action.

**Alternatives considered:**

- *Higher-order screen wrapper* — would force a consistent top bar, but the screens have different top bars today (some have a back arrow, some have settings) and forcing a uniform layout creates more friction than it removes.
- *Imperative `CrisisManager.open()` API from anywhere* — possible but obscures the visual responsibility. Component-based is more obvious to read.

### Sheet lives at root layout, controlled by Zustand

We add a slim `useCrisisStore` (or extend `useSessionStore`) with `{ isOpen: boolean, open(): void, close(): void }`. The sheet itself is rendered once in `app/_layout.tsx` so it sits above every route. The affordance calls `open()`; the sheet reads `isOpen`.

**Why root-mounted:** keeps the sheet z-index trivially above every screen including scene backgrounds, makes the open/close animation independent of route transitions, and avoids needing route-aware portal logic.

### Session-pause channel

The Session screen subscribes to `isOpen` and reacts: when it flips to `true`, it fades audio to silence over 200ms and freezes the breathing/voice timeline. When it flips back to `false`, it resumes from the paused state. The pause state lives entirely inside the Session screen — the crisis store only owns the sheet's open/closed state, not the session's pause state.

**Alternative considered:** a global `isPaused` channel in the session store. Rejected — couples crisis access to session state in a way that bleeds out across the app. Cleaner to keep "is the sheet open" and "is the session paused" as separate signals that happen to align on the Session screen.

### Animation via Reanimated `withTiming`

The sheet uses `react-native-reanimated`'s `useSharedValue` + `withTiming` for the slide-up, matching how `BreathingCircle` and `VoiceLine` are animated. 600ms total, `Easing.out(Easing.cubic)` — no overshoot. The same animation runs in reverse for dismiss.

### tel:1201 via Expo's bundled Linking

`import { Linking } from "react-native"` then `Linking.openURL("tel:1201")` — no new dependency, works on iOS and Android, opens the native dialer with the number prefilled. The number is held in a constant `CRISIS_NUMBER = "1201"` for easy future localization.

### Trusted-contact stub

For v1, tapping `a person you trust` opens a tiny inline message inside the sheet ("you'll be able to add trusted contacts soon") instead of routing to a Settings flow. This avoids designing a contacts-add screen we won't ship in the hackathon, and keeps the action present so the spec's secondary-action requirement is satisfied.

## Risks / Trade-offs

- **Risk:** Root-mounted sheet means the crisis store has to be initialized before any screen renders. → **Mitigation:** the store is a Zustand `create`, initialized at module load — no async setup, no race.
- **Risk:** Session pause/resume could miss state if multiple sheets open in quick succession (e.g. user taps `i`, dismisses, taps `i` again mid-animation). → **Mitigation:** the sheet's `isOpen` is a boolean and toggles cleanly; the Session screen's audio fade is idempotent (fading to silence twice is harmless).
- **Risk:** Adding affordance to Welcome screen breaks the screen's intentionally-spartan composition (single line, single action). → **Mitigation:** the affordance is small (18px glyph) and positioned in the existing top margin — visually quiet.
- **Trade-off:** Hardcoding ERAN 1201 in Hebrew/English copy means future expansion to other countries' hotlines requires copy edits in `i18n.ts`. Acceptable for an Israeli-market product.
- **Trade-off:** The trusted-contact stub gives away that a contact feature is "coming". Better than a broken-feeling action that does nothing.

## Migration Plan

No data migration. No deploy steps beyond shipping the new code. Rollback = revert the change; the previous behavior (no-op `onPress`) is restored.
