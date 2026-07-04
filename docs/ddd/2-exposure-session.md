---
title: "Bounded Context: Exposure Session"
tags: [ddd, bounded-context, core, session]
audience: product, frontend-dev
status: reviewed
---

# ② Exposure Session  *(Core domain)*

> Index: [`README.md`](./README.md) · Spec: [`exposure-session`](../../openspec/specs/exposure-session/spec.md)

**Responsibility:** run the five-state session walk — asset loading, voice disclaimer,
ambient soundscape, HR-adaptive trigger exposure, wind-down, and post-session feedback.

## Tactical model

- **Aggregate root: `Walk`** — `scene`, `machineState`, `elapsed`, `triggerSource | null`, `status` (`active | paused | ended`), `sessionBaseline`.
- **Entities / value objects:** `MachineState` (`LOADING | DISCLAIMER | AMBIENT_FADE_IN | ADAPTIVE_LOOP | WIND_DOWN | POST_SESSION`), `TriggerSource` (a chosen audio variation), `FeedbackAnswers` (post-session questionnaire), `CheckIn` (after-walk reflection).
- **Domain events:** `WalkBegun`, `AssetsReady`, `DisclaimerDone`, `BaselineEstablished`, `PulseSpiked` / `PulseNormalized` (from Pulse Monitoring), `WalkEndedEarly`, `WalkCompleted`, `FeedbackSubmitted`, `CheckInRecorded`.

## Invariants

- States advance **in order**: `LOADING → DISCLAIMER → AMBIENT_FADE_IN → ADAPTIVE_LOOP → WIND_DOWN → POST_SESSION`. No state is skipped or reordered in the normal path.
- A trigger plays **only** for a consented sound; empty consent list ⇒ rehearsal walk (ambient + voice, no trigger). *(Cross-cutting policy 4.)*
- **No live audio streaming** during an active session — all assets must be on-device before `LOADING` completes.
- **No visible pre-trigger warning** — only the ~200ms breathing-circle flash. *(Cross-cutting policy 5.)*
- Display is **elapsed time only** (`m:ss`), never a countdown.
- Early exit routes to the After screen; partial session is recorded, not discarded.
- Output respects the absolute ceiling via `TriggerOutputPolicy`. *(Cross-cutting policy 1; owned by [`3-intensity-control.md`](./3-intensity-control.md).)*

## Relationships

- **Downstream conformist** of Crisis Access — observes `isOpen`, pauses/resumes.
- Consumes **Content Provisioning** (`Scene`, `Sound`, `AmbientTrack`, `VoiceClip`).
- Reads the ceiling from Intensity Control and consent list / scene from User Profile at mount.
- Subscribes to `PulseSpiked` / `PulseNormalized` from Pulse Monitoring to drive trigger gain.

## Today (code mapping)

- `src/app/session.tsx` — five-state `useReducer` machine; `useAudioEngine` + `usePulseMonitor` wired here.
- `src/lib/audio/audio-engine.ts` — `AudioEngine` class (Web Audio Graph: Ambient/Trigger/Voice GainNodes).
- `src/hooks/useAudioEngine.ts` — React hook owning `AudioEngine` lifetime.
- `src/hooks/usePulseMonitor.ts` — HR baseline measurement, spike/normalize events, BLE disconnect.
- `src/lib/audio/asset-cache.ts` — CDN manifest check + `expo-file-system` download (used in LOADING).
- `src/lib/content/content.ts` — `AmbientTrack`, `VoiceClip` types + getters.
- `src/components/features/post-session/` — `PostSessionFeedback` component (POST_SESSION state).
- `src/app/after.tsx` — after-walk reflection screen.
- `src/lib/storage/session-store.ts` — pre-walk selection (scene, consented sounds) read at mount.

## Gaps & compliance flags

- **⚠️ Ubiquitous-language drift:** model term **Check-in** vs code type `Reflection` (`after.tsx`). Reconcile.
- **Check-in persistence:** `CheckInRecorded` unimplemented — reflection held in local `useState` with no persistence (only `TODO(supabase)` marker).
- **Feedback persistence:** `FeedbackAnswers` held in memory; `TODO(supabase)` marker in `PostSessionFeedback` for when schema lands.
- **Breathing pace:** `BreathingCircle` `slow` prop is driven by the `isSpiked` flag from `usePulseMonitor` — now pulse-threshold-driven, not time-scripted. Gap closed.
- **HealthKit:** `usePulseMonitor` uses the mock generator as fallback. HealthKit ACL is a future change; the event seam (`PulseSpiked`/`PulseNormalized`) is live and ready.
