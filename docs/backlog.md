---
title: Feature backlog
tags: [product, scope, planning, clinical]
audience: everyone, product, frontend-dev, clinician
status: living
---

# HearO feature backlog

A running list of feature work, post-2026-06-09 strategic pivot with Dr. Michal Hirschman. Authoritative items live here; the OpenSpec [`changes/`](../openspec/changes/) folder is where any item picked up for implementation gets a proposal + tasks. This doc tracks intent, not the contract.

## 1. Strategic context — the Hirschman pivot

Until 2026-06-09 the working assumption was that HearO would target **severe combat PTSD** under therapist supervision. After the meeting with Dr. Hirschman the target shifted to **mild-to-moderate symptoms with insufficient access to care today**.

Why this matters for every item below:

- **Clinical risk drops dramatically.** Solo exposure work in a severe case can re-traumatize; in a mild case it can't (gradient is too shallow). Self-guided default becomes defensible.
- **Reach broadens.** Mild/moderate is a much larger population than severe-under-clinical-supervision, and is the segment with the *least* existing options.
- **Companion mode is demoted.** What was the centerpiece (therapist-managed dashboard, invite-only patient app) becomes a Tier-2 add-on for patients already in care with Mativ or another partner. The pivot does NOT cancel the in-flight [`introduce-therapist-managed-care`](../openspec/changes/introduce-therapist-managed-care/) change — it reframes it from "the product" to "an extension."
- **Clinical screening at onboarding becomes load-bearing.** The app must filter severe cases out of the self-guided flow and route them to human care.

Two clinical primitives from the Hirschman meeting that recur in the items below:

- **Sympathetic vs parasympathetic.** Trigger → sympathetic activation (fight/flight). Calming protocol = deliberate parasympathetic re-engagement (breath, grounding, body scan).
- **Respondent vs operant conditioning.** Respondent conditioning (the trigger → fear association) is what exposure extinguishes. Operant conditioning (avoidance → temporary relief) is what perpetuates PTSD. Both must be respected by the app's mechanics: a "skip the trigger" button is operant relief and works *against* therapy; an "I need to calm down" button after the trigger is parasympathetic regulation and works *with* it.

## 2. Items

Item IDs are stable across the doc's lifetime so external trackers (Linear, openspec changes) can reference them.

### B — Behavioral / clinical features

#### B-01 — Clinical screening at onboarding

Filter severe PTSD cases out of the self-guided flow. A short clinical questionnaire (PCL-5 is the natural candidate — 20 items, validated, public domain) gates entry: above a threshold → routed to "you should be doing this with a clinician" with a Mativ referral; below threshold → continues into the app.

**Why load-bearing:** the whole "self-guided is safe" claim collapses if severe cases get in.

**Open clinical questions blocking concrete design:** Q-01 (threshold + mild/moderate definition), Q-04 (whether ANY autonomous use is safe).

**Owner:** clinical = Dr. Hirschman + Omer; product = Omer.

**Status:** not started. Blocked on Q-01 and Q-04.

---

#### B-02 — First-session psycho-education

Source: [docs/research/psychoed-first-session.md](#) (the Hebrew doc from Hirschman, to be added under research/). Before the user's first exposure session, show a brief psycho-education screen explaining:

- The amygdala as the body's "smoke detector."
- Why PTSD = the detector stays on max sensitivity after the danger passes.
- The user's distress is not a malfunction — it's a system on emergency settings that helped them survive.
- The upcoming exercise gradually teaches the system the danger has passed.

Show this **once, on first session**. Should be skippable but present by default. Hebrew is the source language; English translation needed.

**Why this first:** it's the smallest, lowest-risk feature (a screen with text), and the user said this is the doc-1 path with the most certain scope.

**Owner:** product = Omer; content review = Dr. Hirschman.

**Status:** ready to start. No blockers.

---

#### B-03 — Self-tap calming protocol (panic-attack assist)

Source: [docs/research/calming-protocol.md](#) (Hebrew Hirschman doc). A button — accessible during a session AND from the home screen — that runs a 60–90s guided calming sequence when the user feels overwhelmed:

1. Validation: "you're safe now; anxiety is a wave that peaks and falls; the body can't hold this tension long."
2. Body grounding (feet on floor, weight in chair).
3. Box breathing (4-4-4-4 cycle), narrated.
4. 3-2-1 sensory grounding (3 see, 2 hear, 1 touch).
5. Session-end cue: "this is part of the process; let's stop here today. You did the work by staying."
6. Optional follow-up content (calming videos/sounds) for the user to recover at their own pace before continuing their day.

**v1 (this item): user-initiated only.** Self-tap button.

**v2 (deferred, see [`v2 — HR-driven calming`](#b-03-v2)):** auto-triggered when HR crosses a threshold during a session. Requires backend telemetry to tune the threshold per-user — not viable until session sync exists.

**Why structured this way:** respects respondent/operant distinction. This is parasympathetic regulation, not avoidance — it runs AFTER engagement with the trigger, not as a replacement for it. The script even names this explicitly: "you did the work by staying."

**Owner:** product = Omer; content review = Dr. Hirschman.

**Status:** ready to start v1 in parallel with B-02. Voice scripts in Hebrew exist; English translation needed.

<a id="b-03-v2"></a>**B-03 v2 — HR-driven version.** Blocked on session-sync backend (depends on `introduce-therapist-managed-care` or a slimmer telemetry-only path).

---

### O — Onboarding & first-run

#### O-01 — Personalized onboarding incorporating clinical screening

Today's onboarding (welcome → permissions → setup) needs to absorb B-01 (clinical screening) before the user reaches setup. The right order is roughly:

1. Welcome.
2. Permissions (pulse, notifications).
3. **Clinical screening (B-01)** — gates everything below.
4. Psycho-education (B-02) — only shown if screening passed.
5. Scene + sound preferences (current Setup screen).
6. Daily reminder.

The pivot also implies the screen-by-screen copy should treat the user as **likely mild/moderate**, not severe — i.e., default tone is "this might help you" rather than "this complements your therapy."

**Owner:** product = Omer; copy review = Dr. Hirschman.

**Status:** blocked on B-01 + B-02 (consumes both).

---

#### O-02 — Safety / intro guide before first real-user access

Per the Hirschman meeting Q-02: define safety metrics, crisis-support mechanisms, and a written intro guide before opening the app to non-team users. Most of this is already in place (crisis sheet, ERAN affordance, RATIONALE doc) but should be **explicitly audited and signed off** before any external user uses the app.

**Owner:** Dekel + Ido. **Status:** open. Bundle with the first TestFlight release (G-04).

---

### C — Companion mode (DEMOTED to Tier 2)

#### C-01 — Therapist-managed care extension

This was the centerpiece of the [`introduce-therapist-managed-care`](../openspec/changes/introduce-therapist-managed-care/) change. After the pivot it's reframed as an **add-on** for patients already in care with Mativ (or another partner): the therapist provisions the scene/sound list and intensity ceiling, the patient app reports session telemetry to the therapist dashboard.

**This is no longer the default path** — solo self-guided is. The change's existing scope is still correct (4–6 weeks: mock UI → schema → auth → patient sync → invite flow); only the framing changes.

**Owner:** product = Omer; backend = Ido + Dekel; design = Roy M.

**Status:** spec exists; not yet implemented. Reprioritize after B-01/B-02/B-03 land — those define the self-guided baseline that the companion mode extends.

---

### R — Research & evidence

#### R-01 — Anonymous data collection with explicit consent

Long-term ambition (Hirschman meeting §6): collect anonymous session data (with consent toggle, default OFF) to contribute to the broader research base on digital exposure therapy. Schema would include: severity-screening band, session phase reached, pulse curve, perceived difficulty, dropouts — never identifying data, never trusted contacts, never crisis taps.

**Why this is a deliberate non-starter for v1:** triggers SaMD-classification questions (see G-02) and Helsinki/IRB scrutiny (see R-02) and HIPAA/GDPR scope (see G-03). Worth committing to in the doc; not worth shipping until we have the legal/regulatory frame.

**Owner:** product = Omer; legal/clinical advisors = TBD.

**Status:** not started. Strategic, not tactical.

---

#### R-02 — Helsinki / IRB approval for clinical research

If R-01 is pursued — and especially if we want to publish or partner with academic institutions — we'll need IRB / Helsinki Committee approval. Lead-time on this is months, not weeks.

**Owner:** Dr. Hirschman + external advisor. **Status:** not started.

---

### G — Governance, infra, partnerships

#### G-01 — Mativ referral protocol

Per Hirschman meeting §5 + open question Q-03: build a **bidirectional referral protocol** with Mativ.

- App → Mativ: severe-screening cases routed out of self-guided flow into Mativ care.
- Mativ → App: Mativ patients in mild post-treatment phase use HearO as a maintenance/companion tool.

Not a code task in v1 — a policy / business-relationship task. Code surface (a `/mativ-referral` deep-link on the screening exit screen) is a 1-day job once the policy is signed.

**Owner:** Omer + Roy M.

**Status:** open. Roy M leading conversation with Mativ.

---

#### G-02 — SaMD vs Wellness classification

Per Q-05. The product positioning ("not a regulated medical device") in [`docs/prd.md` §3](./prd.md#3-goals--non-goals) is intentional and load-bearing for the wellness-app path. If R-01 (data collection) ever ships, the classification question reopens.

**Decision needed:** confirm Wellness classification today, accept that R-01/companion-mode-with-clinical-claims would force a reclassification later, document the trigger criteria.

**Owner:** external legal advisor + team. **Status:** open.

---

#### G-03 — HIPAA / GDPR baseline

Per Q-05. Even as a Wellness app — if we collect any identifying data, sync sessions to a backend, or operate in the EU / serve US healthcare contexts — HIPAA-equivalent (no US healthcare context today → not strictly needed) and GDPR (Israel → covered by adequacy decision but should be ready) apply.

**Practical short-term:** keep the privacy contract from [`introduce-therapist-managed-care/design.md`](../openspec/changes/introduce-therapist-managed-care/design.md) — trusted contacts, crisis taps, and continuous pulse never reach the backend, even for linked patients.

**Owner:** Omer + external legal advisor when companion mode (C-01) lands. **Status:** policy is documented; legal-review checkpoint missing.

---

#### G-04 — TestFlight CI/CD

Per Hirschman meeting task assignments — Dekel owns. Required for any external user (clinician or otherwise) to install the dev build. Composes with O-02 (intro guide must ship in the same TestFlight build).

**Owner:** Dekel. **Status:** in progress.

---

## 3. Open clinical / legal questions

From the Hirschman meeting (2026-06-09). Each blocks at least one backlog item — the "blocks" column makes the dependency explicit.

| ID | Question | Blocks | Owner |
|---|---|---|---|
| Q-01 | How do we operationally define & screen for mild/moderate PTSD in onboarding? Where's the cutoff? | B-01, O-01 | Dr. Hirschman + Omer |
| Q-02 | What concrete safety + support + intro-guide steps are required before opening the app to external users? | O-02, G-04 | Dekel + Ido |
| Q-03 | What does a bidirectional Mativ referral protocol look like — operationally and contractually? | G-01, C-01 | Omer + Roy M |
| Q-04 | Can fully-autonomous app usage (no clinician at all) work safely in mild cases? Or is companion-mode-light always the floor? | B-01, C-01 | Dr. Hirschman |
| Q-05 | What regulatory frame applies — SaMD vs Wellness? Helsinki for R-01? HIPAA/GDPR scope? | R-01, R-02, G-02, G-03 | External legal advisor + team |
| Q-06 | What does sympathetic/parasympathetic regulation evidence look like beyond what was discussed — what's the best protocol for the calming flow (B-03)? | B-03 v1 content review | Team research (per Hirschman action item) |

## 4. Sprint allocation (from the 2026-06-09 meeting)

- **Omer:** comparison vs Mativ + competitor product research.
- **Dekel:** TestFlight CI/CD (G-04); onboarding docs for Mativ partnership (feeds G-01).
- **Ido:** close out remaining sprint tasks; plan next sprint focusing on product-direction refinement; grant repo permissions (DONE — see repo transfer back to Hear-o org).
- **Roy D:** starting new role at Healthin (medtech startup) — continuing as part-time code contributor.
- **Team:** background research on sympathetic/parasympathetic systems + behavioral-science protocols (feeds Q-06 and B-03).

## 5. What's NOT in this backlog

- Anything already in [`openspec/specs/`](../openspec/specs/) — that's shipped behavior, not future work.
- Currently-active OpenSpec changes (`introduce-therapist-managed-care`, `migrate-content-to-api`) — those have their own task lists. The backlog references them where dependencies exist (C-01).
- Bugfixes and minor tweaks — those go straight to PRs.
- Speculative features without clinical grounding (no gamification, no streaks, no social, per [`README.md` "intentionally out of scope"](../README.md)).

## 6. How this doc is maintained

- New items get the next available ID in their letter band (B-04, O-03, etc.).
- An item moves to OpenSpec when it has enough signal to spec (clinical sign-off + design at the level where Given/When/Then is writable). The backlog entry then shortens to a one-line "→ openspec/changes/<name>" pointer.
- Items don't get deleted when shipped — they get a `**Status: shipped** (→ openspec/specs/<capability>)` line and stay for context.
- Open questions get closed by inlining their resolution into the affected item(s) and removing them from §3.
