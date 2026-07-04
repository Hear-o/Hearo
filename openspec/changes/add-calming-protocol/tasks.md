## 1. Content

- [x] 1.1 In `src/lib/content/content.ts`, add `CalmingProtocolStep` type — discriminated union over the five step kinds (`validation`, `body-grounding`, `box-breathing`, `sensory-grounding`, `close`). Each step has its own shape: `validation`/`body-grounding`/`close` are `{ text: LocalizedText; durationMs: number }`; `box-breathing` is `{ cycles: number; phaseMs: number; prompts: LocalizedText[] }`; `sensory-grounding` is `{ steps: { count: number; sense: LocalizedText; prompt: LocalizedText }[] }`.
- [x] 1.2 Add `getCalmingProtocol(): CalmingProtocolStep[]` returning the five steps in order, with content from the Hirschman source (EN + HE).
- [x] 1.3 Unit-test the getter: returns exactly 5 steps in expected order, both languages resolve, box-breathing has 2 cycles (8 prompts), sensory-grounding has 3 steps.

## 2. Voice-script doc

- [x] 2.1 Add `docs/voice-scripts/calming.md` with the source Hebrew + EN translation, side-by-side per step.

## 3. Step components

- [x] 3.1 Create `src/components/features/calming/BoxBreathingTimer.tsx` — a Reanimated component that animates a circle scaling in/out on a 4s in / 4s hold / 4s out / 4s hold cycle, narrating the current phase ("Breathe in 2, 3, 4..."). Accepts `cycles` + `phaseMs` + `prompts` from content. `onComplete` callback.
- [x] 3.2 Create `src/components/features/calming/SensoryGroundingStep.tsx` — shows the three sub-steps (3 see, 2 hear, 1 touch), one at a time, advancing every ~8s. `onComplete` callback.
- [x] 3.3 Create `src/components/features/calming/CalmingProtocol.tsx` — the orchestrator. Steps through the five in order; each step's `onComplete` advances. On the final step's complete, invokes `onProtocolEnd` (provided by the route).

## 4. Screen

- [x] 4.1 Create `src/app/calming.tsx`. Renders `<CalmingProtocol onProtocolEnd={...}>`. On end, routes to `/after` (the protocol counts as a session end). Records `endedBy: "calming-protocol"` in the session-store before routing.
- [x] 4.2 The screen does NOT have an `×` exit button — the protocol is meant to run to completion. The user CAN tap the crisis affordance (always reachable); doing so does NOT cancel the protocol mid-flow (the crisis sheet overlays).
- [x] 4.3 Crisis affordance (`<CrisisAffordance />`) present in top-left, same as every other screen.

## 5. Entry points

- [x] 5.1 In `src/app/session.tsx`, add a small "I need a moment" affordance (visible from `during` and `calming` phases — *not* `opening` so the user has actually engaged the trigger first). On press: stop the audio engine (clean fade-out, ~600ms), then `router.replace("/calming")`.
- [x] 5.2 In `src/app/home.tsx`, add a small secondary button under the primary `Begin` — "Need a moment?" / "צריך רגע?". On press: `router.push("/calming")` (push, not replace — user can return to Home).

## 6. Telemetry hooks

- [x] 6.1 In `src/lib/storage/session-store.ts` (or a new field), record `endedBy: "natural" | "manual-exit" | "calming-protocol"` on the most-recent session record. This is local-only today; surfaces in the After screen if useful, and is the seam for future analytics.

## 7. Verification

- [x] 7.1 `npx tsc --noEmit` clean
- [x] 7.2 `npx jest` — all suites pass, no coverage regressions. New tests for `getCalmingProtocol()`, `BoxBreathingTimer` cycle behaviour, `SensoryGroundingStep` advancement, `CalmingProtocol` orchestration.
- [x] 7.3 `npx -y @fission-ai/openspec validate add-calming-protocol` passes
