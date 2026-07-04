---
title: HearO — Product Requirements Document
tags: [product, prd, clinical, design, scope]
audience: everyone, product, frontend-dev, clinician
status: draft
---

# HearO — Product Requirements Document

> A quiet place to be again.

This PRD consolidates the existing HearO docs into a single product reference. It is a synthesis, not a new source of truth — where it states a behavioral rule, the authoritative contract is the [`openspec/specs/`](../openspec/) capability it cites. Companion docs: [`../README.md`](../README.md) (framing/brand), [`RATIONALE.md`](./RATIONALE.md) (clinical reasoning), [`FRONTEND.md`](./FRONTEND.md) (design system + screen specs), [`CONVENTIONS.md`](./CONVENTIONS.md) (code conventions).

---

## 1. Summary

HearO is a mobile app for veterans living with combat-related PTSD. It delivers gradual, consent-based **sound exposure** — an ambient soundscape layered with user-chosen trigger sounds, guided by a pre-recorded voice and watched over by the user's Apple Watch pulse. The user has two control layers that can only make things **softer, never louder**: a manual intensity dial that is always reachable, and an automatic pulse-driven response that softens the encounter when the body starts to spike. No popups. No alarms.

The product is not a replacement for clinical therapy and is not a regulated medical device. It is a wellness tool with a therapeutic framework, designed Hebrew-first for an Israeli audience, with one-tap crisis access to ERAN 1201 from every screen.

## 2. Problem & opportunity

Combat veterans experience an autonomic spike when a trauma-associated sound shows up in daily life — a motorcycle backfire, a helicopter overhead, fireworks at night, a passing siren. Many of the most disruptive civilian triggers *are* sounds, and they are unavoidable: you can skip a parade, but not a passing motorcycle.

Exposure therapy is the most evidence-supported PTSD treatment (APA and VA/DoD first-line; effect sizes ≈ Cohen's d 1.1 vs. waitlist). Its mechanism is **habituation through corrective re-exposure**. But clinical Prolonged Exposure is hard to access, hard to stay in (20–30% dropout), and clinician-gated. Audio exposure sits between imaginal and in-vivo exposure: concrete enough to provoke the autonomic response that drives habituation, light enough to deliver through a phone. See [`RATIONALE.md`](./RATIONALE.md) for the full clinical basis and citations.

## 3. Goals & non-goals

### Goals
- Widen the window in which a trigger sound is "a sound, not a flashback trigger."
- Keep the user demonstrably in control at all times (manual ceiling that the system can never override upward).
- Use real-time pulse to (a) confirm exposure is engaging the system, (b) soften when arousal crosses a tolerability ceiling, (c) track progress objectively over time.
- Make privacy and crisis access foreground, not buried.
- Ship a demo-ready Hebrew-first / English bilingual experience.

### Non-goals (and what HearO is *not*)
- **Not** a replacement for clinical therapy.
- **Not** a regulated medical device (no FDA / CE / AMAR), **not** diagnostic, **not** for acute crisis (the crisis sheet covers that).
- **Not** surveillance: crisis taps are never logged; the pulse curve stays on-device unless explicitly shared.
- The goal is **not** to make sounds stop bothering the user.

## 4. Target user & persona constraints

A combat veteran, possibly serving or discharged. Knows their triggers. Wants tools, not therapy-marketing. Privacy-conscious, skeptical of "wellness apps," and allergic to the word *hero*.

Hard constraints driven by this persona (load-bearing — not stylistic preferences):

- **No military iconography** anywhere (no camo, dog tags, ranks, flags, silhouettes) — those *are* the triggers being treated.
- **No "thank you for your service" framing**, no hero copy, no badge-of-honor visuals.
- **Privacy is foreground**, not buried in settings (military mental-health stigma is real and affects adoption).
- **Crisis access is one tap from every screen** — quiet, not alarming.
- **Treat the user as capable** — never fragile, never patronizing.

First audience is the Israeli combat veteran (the team can build for them honestly). The broader audience — other veterans, first responders, ICU staff, accident survivors — is out of initial scope but informs the design.

## 5. Core experience (the session loop)

1. User opens the app → sees today's prepared moment (scene + selected sounds).
2. Taps **begin** → ambient soundscape plays through headphones.
3. A pre-recorded voice narrates the scene in soft, second-person prose.
4. After ~60–90s of calm (≈15s in the demo build), a **user-consented** trigger sound enters the mix.
5. Two control layers run in parallel:
   - **Manual** — an always-visible *softer / louder* slider; slider sets a **ceiling** on trigger volume.
   - **Automatic** — Apple Watch streams pulse; if pulse crosses threshold, voice shifts to a calming script, breathing circle slows, trigger auto-attenuates *below* the ceiling. No popup, no alert.
6. Session ends after ~6 minutes → pulse sparkline + a three-option check-in.

The intended emotional signature: **absence of drama on screen** while the soundscape and pulse loop work underneath. That contrast is also the pitch's hero moment.

## 6. Functional requirements

Requirements below are summarized; the binding contracts (Given/When/Then) live in the OpenSpec capabilities. Capability load-bearing order: **crisis-access > intensity-control > exposure-session**.

### 6.1 Exposure session — [`exposure-session`](../openspec/specs/exposure-session/spec.md)
- **Consent-bound triggers** — only plays sounds the user consented to at setup; empty consent list → a rehearsal walk with no trigger, ambient + voice uninterrupted.
- **Three named phases** in order: `opening` (calm ambient + intro voice) → `during` (trigger enters) → `calming` (voice acknowledges the trigger and re-grounds).
- **No visible warning before triggers** — no popup/banner/countdown; the only visual is a single barely-perceptible ~200ms accent flash on the breathing circle (fades over ~1200ms).
- **Voice captions in display serif**, one line at a time, fade-in/out (≤900ms transition).
- **Breathing circle** animates 4s in / 6s out in opening+during, slows to 5s in / 8s out in calming (and when pulse crosses the calming threshold).
- **Continuous pulse display** — from HealthKit (Apple Watch) when available, otherwise the mocked phase-aware pulse generator.
- **Elapsed time only** (`m:ss`), never a countdown or progress-to-target.
- **Early exit** via `×` routes to the After screen (not Home); audio fades over 600ms; the partial session is recorded, not discarded.
- **Crisis access** via the `i` glyph from any phase (see 6.3).

### 6.2 Intensity control — [`intensity-control`](../openspec/specs/intensity-control/spec.md)
This is a **safety capability** as much as a UX one — the exposure model rests on the user trusting they stay in control.
- **Always visible & reachable** in all three phases; smooth continuous (not stepped) drag.
- **Trigger volume only** — ambient and voice are unaffected by the slider.
- **Ceiling, not a fixed level** — actual output may be lower (auto-attenuation) but MUST NEVER exceed the slider position; a ghost indicator shows actual output; output ramps back toward the ceiling over ~4s when pulse normalizes.
- **No numeric labels** — only `Softer` / `Louder` (or Hebrew equivalents); no numbers, percentages, or "level N of M".
- **User input wins concurrent animation** — grabbing the slider mid-auto-animation cancels the animation immediately (Reanimated shared values).
- **Ceiling persists across sessions** — the end-of-session position becomes the next default starting ceiling for that trigger.
- **No mute / no off** — the softest extreme attenuates but never fully silences the trigger.

### 6.3 Crisis access — [`crisis-access`](../openspec/specs/crisis-access/spec.md)
A safety floor: every other screen, animation, or pitch consideration yields to this working reliably.
- **Affordance on every screen** — a small `i` glyph, top-left. MUST use `i`; MUST NOT use `!`, `?`, `SOS`, red icons, or alarm imagery.
- **Opens fast and offline** — within 200ms, no network dependency.
- **Non-alarming headline** — a quiet question (`Need someone to talk to right now?`); MUST NOT contain *crisis*, *panic*, *emergency*, or *help* (or Hebrew equivalents).
- **Call ERAN 1201 via `tel:1201`** — iOS handles the call; the app never places it itself.
- **Secondary "a person you trust"** action → nominated trusted contacts; stub if none configured.
- **Session pauses, does not end** — audio fades to silence over 200ms, breathing freezes; dismissing resumes from where it paused.
- **No backend telemetry on crisis taps** — no request is sent to any server as a result of opening the sheet or tapping call.
- **Dismissible without action** — a `close` link is always present.

## 7. Screen flow

Six screens in the demo path (settings/profile is post-demo polish). Layout sketches and exact copy in [`FRONTEND.md`](./FRONTEND.md#screen-flow).

| # | Screen | Role |
|---|--------|------|
| 1 | Welcome | single sentence + start |
| 2 | Permissions | HealthKit + notifications, privacy-framed |
| 3 | Setup | scene picker + consented sound list (two distinct decisions: *place* vs *consent*) |
| 4 | Home | today's moment, "ready when you are" |
| 5 | **Session** (hero) | ambient → voice → trigger → pulse loop |
| 6 | After | pulse sparkline + three-option reflection (`still here` / `shaken` / `steady`) |

## 8. Design & content constraints

- **Two surfaces:** most of the app is **warm light** (sand/paper); the **Session screen** is intentionally **immersive dark** so scene imagery reads as evening and captions stay legible. Rationale: near-black palettes correlate with depressive affect and red is activating for trauma survivors — hence terracotta accent, muted-clay `critical`, and sage as a calming note.
- **Type:** Frank Ruhl Libre (display serif) + Heebo (body), one family pair across EN and HE (no serif/sans split between languages).
- **Motion:** default 600ms ease-out; scene crossfade 4–7s; trigger flash ~200ms (deliberately undramatic); breathing 4s in / 6s out.
- **Brand / wordmark:** `hear◯` reads as **hear + O** (the O is the breathing circle), never "Hero." Wordmark stays **English-only** in both EN and HE — it is a logo, not a translated string.
- **Words we use / don't:** "today's moment" not "treatment"; "practice" not "therapy"; "your pulse" not "biometrics"; "you" not "the patient/user"; never name the trigger as "trigger"; never mention "PTSD" or "disorder."
- **Bilingual & RTL:** locale detected at launch; Hebrew device → Hebrew UI + RTL; fallback for non-EN/HE devices is **Hebrew**. Full mirroring via `I18nManager.forceRTL` + NativeWind `rtl:` variants.

## 9. Architecture

- **Monolithic frontend** (React Native + Expo SDK 54, managed) talking **directly to Supabase** for persistence/auth. No Node/Express service layer; there is no REST API — the **Supabase schema is the data contract**.
- Persistent data (profile, scene selection, session history, intensity-ceiling memory) → Supabase client. Local-only (UI state, in-session pulse curve, audio engine, breathing animation) stays on device.
- **Content seam:** [`src/lib/content/content.ts`](../src/lib/content/content.ts) is the adapter where local fallback data is replaced by Supabase reads when the schema lands. Migration sites marked `TODO(supabase)`.
- **Privacy boundary:** the HealthKit pulse stream stays on-device and is never posted to Supabase unless the user explicitly shares a session. Crisis taps are never logged. Row-Level Security is the auth boundary (client-side user-ID filters are UX hints, not security).
- Stack details, folder structure, hooks/state/forms/i18n conventions, and current-state-vs-aspiration in [`CONVENTIONS.md`](./CONVENTIONS.md).

## 10. Scope (hackathon)

**In scope:** the six-screen demo path, the two-layer softening, crisis access, EN+HE bilingual + RTL, mocked pulse generator with HealthKit hook, silence-stub assets so the app runs end-to-end.

**Out of scope:**
- Onboarding longer than 3 screens
- Streaks / achievements / gamification
- Social / sharing features
- Multi-device sync
- A clinician-facing dashboard
- Push notifications beyond the daily reminder
- A real account system (single local profile for the demo)
- Watch companion app UI (the watch is a sensor only)

## 11. Success metrics

For the demo/hackathon, success is qualitative and demonstrative:
- The "quiet phone, intense soundscape, rising pulse, calm visuals" contrast lands without explanation.
- Manual-then-automatic softening reads as two distinct beats on stage (~3-minute flow).
- Crisis access works in one tap, offline, from every screen.

Longer-term product metrics (post-demo, currently aspirational): session completion rate, ceiling trend over time per trigger, flatter pulse curve for the same sound across weeks, retention/engagement of the daily-walk loop.

## 12. Open questions & risks

**Clinical / product (from [`RATIONALE.md`](./RATIONALE.md)):**
- **Long-term effect** — no evidence yet that in-session attenuation yields durable tolerance gains; needs a clinical study.
- **Threshold calibration** — the auto-soften pulse threshold (~105 bpm, no personalization) is a guess; the right value depends on baseline HR, fitness, age, medication, tolerance.
- **Frequency / progression** — PE is typically 8–15 weekly sessions; HearO assumes daily ~6-minute walks. Cadence unvalidated.
- **The dropout problem** — engagement loops for PTSD self-help apps are notoriously fragile; the user still has to open the app and start.

**Product / brand (from [`../README.md`](../README.md)):**
- **Wordmark final form** — direction is *hear + O* with O = breathing circle; final graphic must be locked before pixel-level brand work.
- **Watch companion** — out of scope for the hackathon; sensor-only.
- **AI voice generation pipeline** — current spec assumes pre-recorded human or pre-generated clips; generated voice (ElevenLabs, Hume, etc.) is a future backend decision.

## 13. Assets required

Out of frontend scope to create, in scope to integrate (until they land, screens use silence stubs):
- **Ambient loops** (~6 min): `river-path`, `city-evening`, `cafe-morning`, `quiet-road`.
- **Trigger clips** (~3–5s): `motorcycle`, `helicopter`, `fireworks`, `siren`, `car-backfire`, `shouting`.
- **Voice narration** (EN + HE): ~12–15 lines per scene, two scripts per scene (calm + post-trigger calming). Source text in [`./voice-scripts/`](./voice-scripts/).
- **Fonts:** Frank Ruhl Libre, Heebo.

---

## References

- [`../README.md`](../README.md) — product framing, persona, brand, demo flow, scope.
- [`RATIONALE.md`](./RATIONALE.md) — clinical & design rationale with citations.
- [`FRONTEND.md`](./FRONTEND.md) — palette, type, motion, screen specs, RTL.
- [`CONVENTIONS.md`](./CONVENTIONS.md) — tech stack, folder structure, code conventions.
- [`../openspec/specs/`](../openspec/) — binding capability requirements (Given/When/Then).
- [`./voice-scripts/`](./voice-scripts/) — per-scene voice narration source (EN + HE).
</content>
