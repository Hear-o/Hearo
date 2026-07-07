---
title: Companion-level HearO — roadmap (if we had budget)
tags: [product, scope, vision, roadmap, ai, audio]
audience: everyone, product
status: roadmap
---

# Companion-level HearO — roadmap

Where HearO would go if the team had budget. Written in response to the 2026-06-12 Mativ mentor feedback ("an app that learns the user"). **This is a roadmap, not a commitment.** Today the team has no paid services, no clinical advisor on retainer, and no FTE — most of what's below requires unlocking one or more of those.

The roadmap exists for three audiences: (1) the team, to align on direction; (2) Mativ / external mentors, to show we have a coherent next-stage vision; (3) a future funder, to show what each tranche of money would buy.

**Not a chat / companion-app pivot.** We're keeping the session-based exposure model. The companion-feel comes from personalization (knowing the user, generating scenarios for them, narrating in a consistent voice, running a structured arc), not from real-time AI chat. Mativ's "phone friend" framing is the inspiration, not the spec.

---

## 1. What "companion-level" looks like, end-state

Six observable shifts from where we are today, in priority order:

1. **Setup becomes a short intake.** Today: pick a scene, pick sounds. Future: tell us 3–4 things about your life (where the hard places are, what time of day is worst, what's helped you before, what you want to be able to do). The scene/sound picker becomes one part.

2. **Sessions are themed around the user, not the catalog.** Today: "Beach, evening" with a stock script. Future: "Walking past the bank on Allenby on a Friday afternoon" with narration that reflects what the user told us makes that hard.

3. **A program, not a stream of independent sessions.** Today: each session is independent. Future: a 6–8 week structured arc with a stated goal at the top ("be able to walk down Allenby without crossing the street") and progress visible against that goal.

4. **One consistent narrator.** Today: voice is text-only; real audio is `TODO(asset)`. Future: real generated narration in Hebrew + English, one voice across the program.

5. **The app remembers what helped.** Today: post-session feedback is three ratings, stored but never re-used. Future: every "this helped" signal accumulates into a resource bank, surfaced in the right places (calming flow close, crisis sheet, between-session prompts).

6. **Pre-event mode.** Today: HearO is implicitly *training* for hard moments. Future: a "going somewhere difficult?" entry on Home opens a short prep flow, runs while the user walks, debriefs after. Mativ's BEFORE / DURING / AFTER question answered concretely.

What we are **not** building, in any tranche:
- Real-time AI chat ("phone friend" with live LLM responses). Mativ proposed this; we say no. The safety/privacy/cost surface of an LLM in the loop on a clinical-adjacent app is not worth it on any budget. The calming protocol (shipped) + pre-event mode (#6) cover the in-the-moment companion need.
- An adaptive sounds-only app. The exposure-therapy framing is the load-bearing model; personalization is the addition, not the replacement.

---

## 2. What we can do RIGHT NOW with zero budget

A subset of #1 is achievable on current resources (no paid services, no clinical retainer, voluntary engineering time). Worth listing separately because this is the only part the team can commit to today:

| Feature | Cost | Notes |
|---|---|---|
| **Richer Setup intake** — hard places, hard times, goals as free-text fields. | 0 | Local storage, no AI. Step-by-step Setup. |
| **Resource bank** in Setup. Surfaced on calming-flow close + crisis sheet. | 0 | Local storage. ~1 week of work. |
| **"Did this help?" prompt** after every session. Replaces existing post-session ratings. | 0 | One new field on SessionRecord. |
| **Session-record persistence** (extend the existing `lastEndedBy` seam). | 0 | Already half-built; needs JSON-array-in-AsyncStorage and a small UI surface. |
| **Pre-event mode** (re-uses calming-protocol components). | 0 | New `/prep` route. No new clinical content — reuses B-03 wording with a different framing. |
| **Context-aware Home** ("Heading somewhere?" / "How was it?" / "Ready to practice?" based on profile + recent records). | 0 | Pure derived state from local data. |

These six items are the entire "Phase 1" of the roadmap below, achievable on current budget. They get HearO ~60% of the way to companion-feel without any of the AI / audio / clinical bills below.

Realistic timeline at current part-time engineering capacity: ~6 weeks elapsed.

---

## 3. What each budget unlock would buy

Each row is gated independently — you don't have to commit to the whole stack to start unlocking value.

### Unlock A — paid TTS subscription (~$50–200/mo, depending on scale)

**Vendor candidates**: ElevenLabs (Mativ doc named this), Play.ht, OpenAI TTS, Google Cloud TTS. ElevenLabs and Play.ht lead on voice quality and Hebrew support.

**What it buys**:
- Replace every `TODO(asset)` placeholder in `content.ts` with real audio. One consistent narrator across the app, both languages.
- Build-time rendering (not runtime): scripts run once per content change, audio cached on CDN, app downloads + plays. No live API calls during sessions.

**What it does NOT buy**: per-user generated content. That's gated on Unlock B (scenarios) and Unlock D (clinical advisor for templates).

**What we need from the team to actually pull the trigger**: account owner (Roy M makes sense — owns the Mativ relationship, the commercial side), recurring-budget approval.

**Scope of work**: ~1–2 weeks engineering. Mostly tooling + content; very little app-side change.

### Unlock B — Supabase paid tier + scenario generation infra (~$25–100/mo)

**What it buys**:
- Per-user scenarios stored server-side (too large to bundle, varies per user).
- Per-user generated audio cached on the CDN.
- The "templated scenarios" model: human-authored templates (closed-vocabulary slot-fills), user picks the slots in intake, system renders the scene + audio for them. **No LLM in the generation loop in v1** — pure variable substitution. Adding LLM is a later decision once we have a safety review process.
- Session telemetry from linked users (we have the seam designed in `introduce-therapist-managed-care`).

**What it depends on**: Unlock A (need TTS to generate audio per scenario) + Unlock D (need someone clinically responsible to author the templates).

**Critical guard rails baked into the design**:
- Slot vocabulary is **closed**. `location` is from a fixed list (clinic, bank, supermarket, park, etc.), not free user text. Eliminates injection.
- Every rendered scenario is logged so we can audit what the user actually heard.

**Scope of work**: ~3–4 weeks engineering once Unlock A is in place.

### Unlock C — voice actors for HE narration (~$1–3k one-time)

**Why this might come BEFORE Unlock A**: generative TTS Hebrew quality is uneven (most engines were trained primarily on English). If a Hebrew audition under Unlock A doesn't pass the bar for combat-veteran content, the defensible fallback is: human Hebrew voice actor + ElevenLabs for English.

**What it buys**: high-quality fixed-content narration in Hebrew. Only viable for the bounded library (Phase 1 / Phase 2 scenes). Per-user scenarios (Unlock B) cannot economically use voice actors.

**Scope of work**: 1 week engineering + audio production timeline (~2–3 weeks).

### Unlock D — clinical advisor on retainer (~$1–5k/mo)

**This is the biggest gate**, and the one we don't have. Dr. Hirschman gave one-shot input on 2026-06-09 and is not on retainer. Dudi Efrati is listed as a clinical advisor on the About page but is not engaged in ongoing review. Everything currently shipped on `main` (B-01 / B-02 / B-03) had Hirschman's source material at the time but no ongoing clinical sign-off path.

**What an ongoing advisor would unlock**:
- Hebrew translations of shipped content (today: marked `TODO(hirschman-review)` with no path; without ongoing review, those TODOs are dead).
- Sign-off on Unlock B's scenario templates before they reach users.
- Authorship of the program structure (6–8 week arc, adaptation rules, re-screening cadence) — this is Phase 4 of the roadmap and **does not exist without clinical authorship**.
- Defensible safety story for any future R-01 (anonymous data collection) / SaMD discussion.

**Without an advisor**, the team's defensible position is:
- Ship only content that has been authored or directly approved by a clinician at some point (current EN content from Hirschman's one-shot doc qualifies; future generated content does not).
- Keep HearO labeled and positioned as wellness, not therapeutic. The classification matters legally and we should stop treating any of this as "clinical".
- Hebrew localization stays unreleased until a translator with clinical background reviews — even if that's a one-shot engagement (~$500–1000) rather than a retainer.

**This unlock matters more than any of the others combined.** It's what gates moving from "what we have" to "personalized at clinical quality."

### Unlock E — part-time FTE engineer (~$8–15k/mo)

Current capacity is voluntary part-time across Omer / Ido / Roy D / Dekel. Realistic delivery is ~1 small feature every 2 weeks. An FTE engineer would 4× that.

What it buys: speed. Doesn't unlock any new capability that the unlocks above don't, but it compresses the calendar significantly. Without it, the rest of this roadmap takes 6–12 months elapsed regardless of which other unlocks happen.

---

## 4. End-state architecture (if Unlocks A + B + D are in place)

Storage model when fully built out:

```
UserProfile (new local storage shape, syncs to Supabase if user opts in)
  displayName              # already shipped
  hardPlaces[]             # from richer intake (closed-vocab list)
  hardTimes[]              # closed-vocab
  triggers[]               # already shipped (consented sounds)
  resources[]              # free-text, never synced
  goals[]                  # free-text, optional sync

SessionRecord (today: scalar; future: persisted array)
  takenAt, scene, trigger, ceilingChosen, peakAttempted,
  durationMs, endedBy, helped, difficulty, notes?

ProgramState (only with Unlock D)
  programTemplate          # clinician-authored, fixed list
  week
  sessionsThisWeek
  goalProgress             # derived
```

Privacy contract stays unchanged from today: trusted contacts + crisis taps never sync, even when linked. Continuous (non-session) pulse never syncs. Screening results sync only on opt-in.

---

## 5. What about Hirschman / Mativ / Dudi specifically?

Worth being honest in the doc since people read this:

- **Dr. Hirschman**: one-shot meeting on 2026-06-09. Source material for B-02 / B-03 came from her. We have not asked for, and should not assume, ongoing review. The `TODO(hirschman-review)` comments inline in `content.ts` are aspirational, not a planned workflow.
- **Mativ** (the institute, via Dudi as Roy M's mentor relationship): one-shot review on 2026-06-12 produced the Blue Flag document. Useful direction-setting; no ongoing mentoring commitment.
- **Dudi Efrati** (Clinical advisor card on the About page): listed as advisor but not engaged in ongoing review or clinical authorship.

This is not a criticism — it's the actual state. The roadmap above is honest about which parts require an engaged clinician (Unlock D) and which don't.

---

## 6. Risks specific to this roadmap

| Risk | Mitigation |
|---|---|
| Building Phase 1 without committing to Phases 2–4 leaves an awkward middle state | Phase 1 is designed to be valuable in isolation: richer intake + resource bank + pre-event mode + helped-tagging each work as standalone features. If we stop after Phase 1, the app feels more personal even with no AI / no clinician. |
| Generated content drifts into clinically unsafe territory | Closed-vocab slot-fills only. No LLM in v1 generation. Every rendered scenario logged. None of this ships without Unlock D anyway. |
| ElevenLabs cost scales unexpectedly with per-user scenarios | Build-time render of fixed library (Unlock A). Per-user render with aggressive caching (Unlock B). Generation budget is bounded by a per-user-per-month cap, not unbounded. |
| Per-user data is sensitive (hard places, goals) when synced | Stays local-first by default; Supabase sync is opt-in per the `introduce-therapist-managed-care` design. RLS policies must be in place before Unlock B ships. |
| Mativ might want the chat layer they proposed | We say no, on the record. If the funder is Mativ-aligned and insists, this is a re-open of the product direction conversation, not an extension of this roadmap. |

---

## 7. What changes in the existing backlog if we approve this direction

(Not changing the backlog file yet — listing here so we can update it together.)

- **O-01** (personalized onboarding): becomes Phase 1 of this roadmap, concretely scoped.
- **C-01** (companion mode — therapist-managed care): stays separate. This roadmap is about per-user personalization; C-01 is about clinician-supervised care. They're different products that could coexist.
- The `TODO(hirschman-review)` comments throughout `content.ts` and the openspec changes need a different plan — either (a) accept the current EN as final and unblock Hebrew via a one-shot translator engagement (Unlock D-light), or (b) ship EN-only indefinitely.
- Q-01 (mild/moderate definition) — already answered by the research review (PC-PTSD-5 ≥ 3); we can close this question.
- Q-04 (autonomous-use safety) — without an ongoing clinical advisor, this stays an open question we live with. The conservative cutoff + crisis affordance + above-threshold routing are our defensible mitigations, not a closed answer.

---

## 8. What I'd ask of the team next

This isn't actionable engineering work yet. The next step is a 30-minute team conversation on three questions:

1. **Are we on the roadmap?** If yes, Phase 1 (zero-budget) starts. If no, we say so and stop spending time on this.
2. **Who owns chasing the unlocks?** Specifically: who's responsible for the budget conversation, the clinical-advisor search, the TTS account?
3. **What's the relationship with Mativ going forward?** One-shot was useful; do we want ongoing mentoring? If yes, who's the team contact?
