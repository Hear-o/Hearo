## Why

Per the 2026-06-09 meeting with Dr. Hirschman and her calming-protocol source doc (see [`docs/backlog.md#b-03`](../../../docs/backlog.md#b-03--self-tap-calming-protocol-panic-attack-assist)), the app needs a deliberate way for the user to **engage the parasympathetic system** after a trigger has pushed them too far. This is structurally different from the existing pulse-driven trigger-attenuation:

- **Trigger attenuation** softens the stimulus (handled today by `intensity-control` + `exposure-session`).
- **Calming protocol** regulates the *body's response* — breath, grounding, sensory anchoring — and ends the session.

Without this, an overwhelmed user has three options: ride it out (re-traumatizing), tap the crisis sheet (designed for an actual crisis, not a difficult session), or close the app (operant avoidance — actively *worsens* PTSD per Hirschman's "respondent vs operant" framing). The calming protocol is the clinically correct fourth option: **parasympathetic regulation framed as completing the work, not avoiding it**.

The protocol script ends with explicit framing — *"this is part of the process; let's stop here today; you did the work by staying"* — that distinguishes it from operant relief.

## What Changes

- New `calming-protocol` capability — a guided ~90-second sequence (validation → body grounding → box-breathing → sensory grounding → close + recovery offer).
- New route `/calming` accessible from:
  - During-session: a new "I need a moment" affordance on `/session`.
  - Home screen: a small secondary button.
- The protocol routes to `/after` on completion (it ends the session, same as natural session-end). The session telemetry records `endedBy: "calming-protocol"` so we can distinguish completed-via-protocol from completed-naturally in future analytics.
- Content for all five steps in EN + HE, in `lib/content/content.ts` under a new `getCalmingProtocol()` getter.
- v1 is **user-initiated only** (this proposal). v2 (HR-driven auto-trigger when pulse crosses a threshold during a session) is explicitly deferred — see "Out of scope" below.

## Capabilities

### New Capabilities

- `calming-protocol`: parasympathetic regulation flow. Today: 5-step user-initiated protocol (validation, body, box-breathing, sensory, close). Future v2: HR-driven auto-trigger (requires backend telemetry to tune per-user threshold).

### Modified Capabilities

- `exposure-session`: a session can end via the calming protocol, not only by reaching natural end or by the user pressing `×`. The session-end pathway must record which exit was used.

## Out of scope

- **v2 HR-driven auto-trigger**: blocked on session-sync backend (no way to tune per-user threshold without telemetry). Will be a separate change once `introduce-therapist-managed-care` or a slimmer telemetry path lands.
- **Custom protocol duration**: the v1 protocol runs to completion (~90s). No skip-step affordance — partial completion defeats the parasympathetic activation. The whole point is that the user has *committed* to the regulation, the way clinical breathwork prescribes a full set.
- **Audio recordings**: voice narration for the protocol is text-only in v1. Recording the script (in Hebrew first) is a content task tracked separately under `docs/voice-scripts/calming.md`.

## Impact

- **New files**: `src/app/calming.tsx`, `src/components/features/calming/CalmingProtocol.tsx`, `src/components/features/calming/BoxBreathingTimer.tsx`, `src/components/features/calming/SensoryGroundingStep.tsx`.
- **Edited**: `src/lib/content/content.ts` (`getCalmingProtocol()` + types), `src/app/home.tsx` (button), `src/app/session.tsx` ("I need a moment" affordance + route), `src/lib/ui/i18n.ts` (string keys).
- **New voice-script doc**: `docs/voice-scripts/calming.md` with the source Hebrew + EN translation.
- No new dependencies — box-breathing animation is Reanimated (already in use), no new audio (text-only v1).
- **Clinical sign-off required** (Dr. Hirschman) before any external user reaches this protocol. The text is hers; the implementation must faithfully reproduce the sequence she wrote.
