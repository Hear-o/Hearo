## Why

Per the 2026-06-09 meeting with Dr. Hirschman (see [`docs/backlog.md#b-01`](../../../docs/backlog.md#b-01--clinical-screening-at-onboarding)), the strategic pivot from "severe PTSD with clinical supervision" to "mild/moderate self-guided" is only safe if probable-PTSD cases are filtered out of the self-guided flow. The whole defensibility of solo exposure rests on the screening gate.

This change implements the screen. Earlier scaffold work (storage shape, flow hook) was held pending input on the instrument + threshold; both are now resolved by literature review (see `docs/research/clinical-screening-review.md` — added in this change).

## Instrument decision: PC-PTSD-5 with cutoff ≥ 3

**Instrument**: [PC-PTSD-5](https://www.ptsd.va.gov/professional/assessment/screens/pc-ptsd5.asp) — the VA National Center for PTSD's primary-care PTSD screener for DSM-5. Five yes/no items preceded by a trauma-exposure gate question.

**Why PC-PTSD-5 over PCL-5**: PCL-5 is 20 items and validated for symptom *tracking* (severity gradient 0–80). For onboarding triage — a 30-second gate — PC-PTSD-5 is the purpose-built instrument. Same VA source, public domain, validated cutoffs from Prins et al., 2016. PCL-5 length would tank onboarding completion.

**Cutoff**: **≥ 3 (yes responses)** = "above-threshold, route to clinician care". Sensitivity 0.95, specificity 0.85 (Prins et al., 2016, validated against CAPS-5). Conservative — accepts some false-positive gate-outs (mild users incorrectly routed to clinician) in exchange for high sensitivity (catching 95% of probable-PTSD cases).

**Two-band outcome, not four-band severity**: research review confirmed the popular "minimal/mild/moderate/severe" PCL-5 banding (0-13 / 14-32 / 33-49 / 50-80) is NOT VA-published — it's apocryphal. PC-PTSD-5 by design gives a two-band outcome (below-threshold / above-threshold). We adopt the same model.

## What Changes

- Implement the `/screening` route — 3-screen flow:
  1. **Intro + trauma-exposure question** (yes/no). If "no" → outcome is `no-trauma`, continue to `/setup`. The PC-PTSD-5 items are administered only when the person has experienced a traumatic event.
  2. **Five PC-PTSD-5 items** rendered as a vertical list, yes/no toggle each, single Submit at bottom.
  3. **Outcome screen** — below-threshold continues to `/setup`; above-threshold shows a clinician-recommendation card with a Mativ deep-link placeholder (G-01) AND a "continue anyway" affordance (HearO is a wellness app, not a gated medical device — we surface the recommendation, the user decides).
- Update the `ClinicalScreeningResult` storage shape from the earlier band-based scaffold to the PC-PTSD-5 outcome model.
- Wire `/screening` into the onboarding flow at the point marked by `TODO(B-01)` in `permissions.tsx`. Replace the comment with the real gate.
- Add EN content (verbatim from the VA's official PC-PTSD-5 PDF) and draft HE content (forward translation, flagged `TODO(hirschman-review)` per item — Hirschman MUST sign off before Hebrew release).
- Add `docs/research/clinical-screening-review.md` with cited sources for the instrument choice + cutoff + scoring methodology.

## Capabilities

### MODIFIED Capabilities

- `clinical-screening`: full implementation replacing the scaffold-only spec. Two-band outcome model (`no-trauma | below-threshold | above-threshold`) replaces the earlier `mild | moderate | severe` shape.

### MODIFIED Capabilities (other)

- `exposure-session`: above-threshold users see a clinician-recommendation card before `/setup`. They CAN continue (the gate is advisory, not a hard block — HearO is wellness-classified). The recommendation is rendered as one card on the post-screening screen, not repeated on every subsequent session.
- `home-personalization`: onboarding ordering becomes Permissions → Screening → Setup → Home. Returning users skip Screening (`getClinicalScreeningResult() !== undefined`).

## Out of scope

- **Re-screening cadence.** This change persists a single screening result. Re-screening every N months (clinical norm for PTSD progress tracking) is a separate change once we have session telemetry to compare against.
- **Hard gating.** The above-threshold outcome shows a recommendation, not a block. Hardening this into a refuse-to-continue gate is a future product call gated on Hirschman + legal review.
- **Hebrew validation.** The draft HE translation is best-effort, flagged for Hirschman review. Sourcing a peer-reviewed Hebrew PC-PTSD-5 (Israeli MoH / IDF / PubMed) is a separate research task before any Hebrew-language release.
- **Suicide screening.** A parallel single-item suicide/self-harm gate (e.g., PHQ-9 item 9) was considered and deferred. The crisis affordance (one-tap ERAN access from every screen) remains the in-the-moment safety net; product call to add a parallel intake item is a future change.

## Impact

- **New file**: `src/app/screening.tsx` — the multi-step flow.
- **New file**: `src/components/features/screening/PcPtsd5Form.tsx` — the 5-item yes/no form (extracted so the screen file stays thin).
- **New file**: `docs/research/clinical-screening-review.md` — instrument selection + scoring + threshold rationale, with citations.
- **Edited**: `src/lib/storage/storage.ts` — `ClinicalScreeningResult` shape change.
- **Edited**: `src/lib/content/content.ts` — `getClinicalScreening()` getter with EN + draft HE content.
- **Edited**: `src/app/permissions.tsx` — replace `TODO(B-01)` with real route to `/screening` on first launch.
- **Edited**: `src/lib/ui/i18n.ts` — i18n keys for the screening flow.
- **No new dependencies.** No network. No new permissions.

## Clinical sign-off

The English item text is verbatim from VA's PC-PTSD-5 PDF — public domain, no clinical review needed at the item level. The flow design (3 screens, advisory above-threshold outcome) and the **Hebrew translation** both require Dr. Hirschman's review before any external-user release.
