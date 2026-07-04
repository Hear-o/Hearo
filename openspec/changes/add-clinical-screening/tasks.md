## 1. Storage shape

- [x] 1.1 Add `ClinicalScreeningResult` type + getter/setter to `src/lib/storage/storage.ts`. (Done in scaffold; reshape below.)
- [x] 1.2 Reshape `ClinicalScreeningResult` from the old band model (`band: "mild" | "moderate" | "severe"`) to the PC-PTSD-5 outcome model: `{ instrument: "pc-ptsd-5"; version: string; traumaExposure: boolean; answers: boolean[] (length 5); score: number (0–5); cutoff: number; outcome: "no-trauma" | "below-threshold" | "above-threshold"; takenAt: number }`.
- [x] 1.3 Update storage tests for the new shape — round-trip each outcome (no-trauma / below-threshold / above-threshold) + the tri-state semantics on the storage layer (`undefined` = never asked, `null` = declined, record = answered).

## 2. Content

- [x] 2.1 Add `PcPtsd5Content` type and `getClinicalScreening()` getter in `src/lib/content/content.ts`. Include: intro copy + trauma-exposure question + 5 PC-PTSD-5 items + outcome screen copy (both below- and above-threshold).
- [x] 2.2 Author EN content verbatim from the VA's official PC-PTSD-5 PDF (public domain).
- [x] 2.3 Author draft HE translation, every item commented `TODO(hirschman-review)`.
- [x] 2.4 Unit-test the getter: exactly 5 items, both languages populated, score-keying matches the form layout.

## 3. Research doc

- [x] 3.1 Add `docs/research/clinical-screening-review.md` documenting the instrument decision, cutoff rationale, scoring methodology, and verified sources from the literature scan.

## 4. Screening flow

- [x] 4.1 Create `src/components/features/screening/PcPtsd5Form.tsx` — the 5-item yes/no form. Vertical list, yes/no toggle each, Submit at bottom (disabled until all 5 answered).
- [x] 4.2 Create `src/app/screening.tsx` — 3-screen flow:
  - Step 1: intro copy + trauma-exposure yes/no.
  - Step 2: PC-PTSD-5 form (only if step 1 = yes).
  - Step 3: outcome — below-threshold continues, above-threshold shows clinician recommendation + Mativ placeholder + continue-anyway link.
- [x] 4.3 Scoring logic: sum `true` answers (each yes = 1), cutoff at ≥ 3 = above-threshold. If trauma-exposure = no → outcome = `no-trauma` (score = 0, cutoff irrelevant).
- [x] 4.4 Persist via `setClinicalScreeningResult` at the point the outcome is computed (start of step 3, before render).
- [x] 4.5 Crisis affordance in top-left of every screen, same as every other route.

## 5. Onboarding wire-in

- [x] 5.1 In `src/app/permissions.tsx`, replace the `TODO(B-01)` comment with the real gate: if `getClinicalScreeningResult() === undefined`, route to `/screening`; otherwise route to `/setup` as today.

## 6. i18n

- [x] 6.1 Add `screening.*` keys to `src/lib/ui/i18n.ts` for the screen-level copy (button labels, progress text, outcome titles). Item content + intro prose comes from `getClinicalScreening()`, not i18n — the bilingual content adapter owns its own translations.

## 7. Verification

- [x] 7.1 `npx tsc --noEmit` clean.
- [x] 7.2 `npx jest` — all suites pass, coverage thresholds hold. New tests for storage shape, content getter, scoring at boundaries (score=2 below, score=3 above, score=5 above), no-trauma path.
- [x] 7.3 `npx -y @fission-ai/openspec validate add-clinical-screening` passes.
