---
title: Clinical screening instrument review — PC-PTSD-5 vs alternatives
tags: [clinical, research, screening, ptsd]
audience: clinician, product, frontend-dev
status: source
---

# Clinical screening instrument review

Selection rationale for the screening instrument used at HearO onboarding, against constraints documented in [`openspec/changes/add-clinical-screening/proposal.md`](../../openspec/changes/add-clinical-screening/proposal.md). Researched 2026-06-11 via a 5-angle web-search / 23-source fetch / adversarial-verification pass. All claims below cite verified primary sources from that review.

## TL;DR

**Use PC-PTSD-5 with cutoff ≥ 3.** Five yes/no items preceded by a trauma-exposure gate, ~30 seconds to complete on a phone, public-domain (VA NCPTSD), validated for self-administration, designed precisely for the use case HearO has — primary-care triage to "does this person need PTSD care?". The competing instrument we considered (PCL-5, 20 items) is the field standard for symptom tracking but not for onboarding — its length would tank completion. PC-PTSD-5 trades severity gradient for brevity, which is the right trade-off for an onboarding gate.

## What we ruled out

### PCL-5 (20 items, 0-4 Likert, total 0-80)

PCL-5 is the gold standard for PTSD severity assessment, distributed by the [VA National Center for PTSD](https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp). Public domain, self-administered, validated, used by PTSD Coach (VA's own digital app).

Why we didn't pick it: 20 items at ~10-15 seconds each ≈ 3-5 minutes. For an onboarding GATE — not symptom tracking — that's far too long. Drop-off risk during the questionnaire would gate out users we don't intend to gate. The four-band severity gradient PCL-5 enables (more granular than yes/no) isn't load-bearing for our design: we have a single binary decision (recommend clinician care or continue self-guided), not a per-band UI.

**Important correction from the literature review**: the popular online table mapping PCL-5 to "minimal 0-13 / mild 14-32 / moderate 33-49 / severe 50-80" is **not VA-published** and was refuted in adversarial verification. The only VA-published cutoff is **31-33 for "probable PTSD"** ([VA scoring document](https://www.ptsd.va.gov/professional/assessment/documents/using-PCL5.pdf)). If we ever do switch to PCL-5, the gate is two-band (sub-threshold / probable PTSD), not four-band severity.

### PC-PTSD-5 (5 items, yes/no) — selected

Five yes/no items preceded by a trauma-exposure gate question. Score = count of "yes" responses (0-5). From [Prins et al., 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5023594/), validated against CAPS-5 in a VA primary-care sample.

Cutoffs:
- **≥ 3**: sensitivity 0.95, specificity 0.85 — catches 95% of probable-PTSD cases, with a higher false-positive rate.
- **≥ 4**: sensitivity 0.83, specificity 0.91 — balanced.
- **≥ 5**: sensitivity 0.56, specificity 0.97 — misses cases.

**We chose ≥ 3.** For a wellness app routing users to clinician care, sensitivity matters more than specificity: a false-positive routes a user to a recommendation they can decline; a false-negative gates a probable-PTSD user into unsupervised exposure work. The asymmetry favours the higher-sensitivity cutoff.

Distribution: official VA PDF at [ptsd.va.gov](https://www.ptsd.va.gov/professional/assessment/screens/pc-ptsd5.asp). Public domain. Confirmed by the [VA scoring information document](https://www.ptsd.va.gov/professional/assessment/documents/PCL_Scoring_Information.pdf).

### PC-PTSD-5 trauma-exposure gate

PC-PTSD-5 is administered ONLY after the user affirms exposure to a traumatic event. If they answer "no" to the gate, the 5 items are not administered. HearO follows this protocol — `traumaExposure: false` → outcome `no-trauma` → score 0 → continue to setup.

### Other instruments considered

- **ITQ (International Trauma Questionnaire)**: 18 items, ICD-11-based PTSD/CPTSD measure. The [VA's own ITQ page](https://www.ptsd.va.gov/professional/assessment/adult-sr/itq.asp) publishes no severity cutoffs and no screening guidance — measures a different construct (CPTSD distinction) than our gate needs.
- **DSM-IV PCL (PCL-C, PCL-M)**: 17 items, legacy, superseded by PCL-5 for DSM-5-era clinical work. Different cutoffs (44 general, 50 military). Not the right choice in 2026.
- **TSQ (Trauma Screening Questionnaire)**: 10 items, yes/no, Brewin et al., 2002. Validated, free, less commonly used than PC-PTSD-5. No advantage over PC-PTSD-5 for a 30-second gate.

## Scoring & flow

The implementation lives at [`src/lib/content/content.ts`](../../src/lib/content/content.ts) (`getClinicalScreening`, `computeClinicalScreeningOutcome`) and [`src/app/screening.tsx`](../../src/app/screening.tsx).

```
        ┌─────────────────────────────────────────────────┐
        │ Step 1: trauma-exposure question                │
        │   "Have you ever experienced a traumatic event?"│
        └────────────────┬───────────────┬────────────────┘
                         │ yes           │ no
                         ▼               ▼
        ┌─────────────────────┐    outcome = no-trauma → /setup
        │ Step 2: 5 items     │
        │   sum yes = score   │
        └─────┬───────────────┘
              │
       ┌──────┴──────┐
       │ score < 3   │ → outcome = below-threshold → /setup
       │ score ≥ 3   │ → outcome = above-threshold → clinician recommendation + Continue → /setup
       └─────────────┘
```

The above-threshold outcome is **advisory, not blocking**. HearO is wellness-classified; we surface the recommendation and offer a clinician hand-off (Mativ deep-link, placeholder until G-01 lands), then let the user continue if they choose.

## Hebrew translation

The 2026-06-11 research pass found **no verified Hebrew-validated PC-PTSD-5** in the searched literature. Israeli academic studies and IDF mental health work likely have working translations, but we didn't surface a citable peer-reviewed validation paper.

What we ship today:
- **EN**: verbatim from the official VA PC-PTSD-5 PDF (public domain).
- **HE**: forward-translation drafts inline in `content.ts`, every string marked `TODO(hirschman-review)`. The intent is that Dr. Hirschman reviews these before any Hebrew-locale public release. The trauma-exposure prompt is paraphrased (the official enumeration is long and we condense for mobile) — wording is checked against the VA's clinical intent but is not a verbatim translation of any single source.

**Pre-Hebrew-release checklist**:
1. Source a peer-reviewed Hebrew PC-PTSD-5 (PubMed, Israeli MoH, IDF Mental Health Branch).
2. Run forward-back translation if no validated version exists.
3. Hirschman sign-off on every string.

## Open safety question

The deep-research pass did **not** surface empirical evidence on harm from routing high-symptom users to unsupervised self-guided exposure (re-traumatization, dropout, symptom worsening). This is the load-bearing safety question for HearO's design and remains open.

Mitigations in our shipped design:
1. Conservative gate (≥ 3 = recommend clinician).
2. Advisory outcome with a Mativ hand-off (above-threshold users see a clear pathway to human care).
3. Always-present crisis affordance (ERAN 1201) on every screen, including the screening itself.
4. No "you have PTSD" labeling — we say "could benefit from a conversation with someone trained in trauma", not a diagnosis.

A targeted safety literature review (adverse events in unsupervised digital exposure for moderate-to-severe PTSD) is the next research task before a non-team-only release.

## Sources

Primary:
- VA NCPTSD PC-PTSD-5: https://www.ptsd.va.gov/professional/assessment/screens/pc-ptsd5.asp
- Prins et al., 2016 (PC-PTSD-5 validation, PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC5023594/
- VA PCL-5 scoring information (for reference): https://www.ptsd.va.gov/professional/assessment/documents/using-PCL5.pdf
- VA PCL_Scoring_Information PDF: https://www.ptsd.va.gov/professional/assessment/documents/PCL_Scoring_Information.pdf
- VA ITQ landing (for what we ruled out): https://www.ptsd.va.gov/professional/assessment/adult-sr/itq.asp
- PTSD Coach evaluation (PMC, for precedent): https://pmc.ncbi.nlm.nih.gov/articles/PMC9006138/

Refuted (these should NOT be cited as authoritative):
- The "minimal/mild/moderate/severe" PCL-5 banding table that circulates on third-party sites — voted 0-3 (refuted) in adversarial verification.
- "PTSD Coach gates at PCL-5 ≥ 33" — voted 0-3 (refuted); PTSD Coach uses PCL-5 as an instrument but does not gate users at any published threshold.
