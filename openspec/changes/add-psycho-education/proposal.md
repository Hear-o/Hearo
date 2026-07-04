## Why

Per the 2026-06-09 meeting with Dr. Michal Hirschman (see [`docs/backlog.md#b-02`](../../../docs/backlog.md#b-02--first-session-psycho-education)), the user's distress during exposure has a specific clinical explanation — the amygdala stuck on "emergency settings" — and that explanation, given **before** the first session, materially changes the experience. The user comes in expecting a malfunction; they leave understanding it as an adaptive system that hasn't yet learned the danger has passed.

This is the smallest item on the backlog and the lowest-risk: one screen, shown once. It's also one of the only things the app can do that resembles what a clinician would do in a first appointment — context-setting before exposure. Skipping it means the user's first exposure happens cold, against the advice of the clinical contributor.

## What Changes

- Add a `psycho-education` capability — a one-time, before-first-session content screen that explains the amygdala / "smoke detector" framing in calm, second-person prose.
- New route `/psychoed` rendered between the Home `Begin` press and the `/session` route. Skippable; once seen, it does not show again. The user can re-read it from a link on the Setup screen (or the Mentor screen if we add one later).
- New storage entry `psychoEducationSeen` (boolean) — module-level seam in `lib/storage/storage.ts`, same pattern as `healthKitGranted`.
- Content in `lib/content/content.ts` under a new `getPsychoEducation()` getter, EN + HE — Hebrew is the source language per the Hirschman doc, English is translated.

## Capabilities

### New Capabilities

- `psycho-education`: pre-session context-setting. Today: amygdala framing shown once before first session. Future: post-session reflection cards, "what just happened" follow-ups, deeper modules.

### Modified Capabilities

- `exposure-session`: the session flow is gated by `psychoEducationSeen` — the first `Begin` press routes to `/psychoed` before `/session`; subsequent presses go straight to `/session`.

## Impact

- **New file**: `src/app/psychoed.tsx` — the screen.
- **New file**: `src/components/features/psychoed/` — components (if any factoring needed; default is single screen with no helpers).
- **Edited**: `src/lib/storage/storage.ts` (new `psychoEducationSeen` flag), `src/lib/content/content.ts` (new `getPsychoEducation()` getter + `PsychoEducationContent` type), `src/app/home.tsx` (gate the Begin press through `/psychoed` on first run), `src/lib/ui/i18n.ts` (route header keys).
- No new dependencies, no network, no permissions.
- Content review: the **clinical text MUST be reviewed by Dr. Hirschman before any external user sees it** — same gating as future B-01 work. Until reviewed, this ships behind the team-only TestFlight build (G-04), not to App Store.
