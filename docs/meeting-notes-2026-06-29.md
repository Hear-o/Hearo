# Meeting notes — 2026-06-29

**Topic:** Behavioral / "second half" of HearO + AI companion direction
**Attendees:** Omer Keinan, Claude
**Context:** Following v1.1.5 ship, opening conversation about what to build after the practice / exposure-therapy core.

---

## Framing

HearO's first half is the practice loop (scene + trigger + ambient + voice). The "second half" is everything that supports the veteran *outside* a deliberate session.

This splits into two distinct moments with different design constraints:

1. **In-the-moment support.** When something hits in real life (fireworks at a wedding, car backfire, sudden noise). The user needs immediate grounding without setup. No time for a 7-minute session.
2. **Processing afterward.** Reflection and integration after a hard moment passes — the half of exposure-therapy programs that builds self-awareness and pattern recognition over time.

The current app addresses only the practice loop. The crisis affordance (one-tap to ERAN 1201) is the emergency escape valve, but there's a wide middle territory between "fine" and "crisis" the app doesn't speak to.

---

## Existing infrastructure that supports the second half

- `useCalmingOverlay` (`src/hooks/useCalmingOverlay.ts`) — neo-classical bed + grounding voice, already standalone, triggered from `/calming`.
- `CalmingProtocol` + `SensoryGroundingStep` (`src/components/features/calming/`) — 5-4-3-2-1 sensory grounding step component.
- "Need a moment" pause inside a session (`/session` → `/calming` → back).
- `CrisisAffordance` / `CrisisSheet` — ERAN 1201 + trusted contacts.
- HealthKit pulse adapter (`src/lib/integrations/healthKit.ios.ts`) — can read live HR outside of sessions on iOS.
- Sessions counter + daily affirmation on `/home`.

---

## Options discussed

### In-the-moment ("right now")

- **"Right now" button on `/home`.** Opens the calming overlay fast, no session setup. Reuses existing infrastructure end-to-end. Closest thing to a 1-week feature in this design space.
- **Pulse-aware auto-suggest.** Detect HR spike via HealthKit and surface a grounding prompt. iOS only. Requires background HealthKit live read — larger scope, infrastructure investment.

### Processing later (journal / log)

- **Lightweight log.** One-tap "I had a hard moment" + mood-before/after sliders + optional one-line note. On-device only. No AI.
- **Voice journal.** Audio memo, on-device transcription. Lower friction than typing for activated users.
- **Patterns surface.** Aggregations like "this week you noted 4 moments, mostly after 6 PM." Insight without prescription.
- **Therapist-shareable notes.** Feeds into the `introduce-therapist-managed-care` openspec change. Highest clinical value, also the highest consent surface — depends on therapist auth shipping first.

### AI companion (per `docs/companion-plan.md`)

Roy's plan to wire Dekel's `edge-intelligence-sdk` (Tovli/EdgeIntelligence) — on-device 0.5B Qwen2.5 quantized model with a prompt-contract referral path.

Two implementation paths discussed:

- **A. Stub-first chatbot UX.** Ship the chat screen + ~20 canned starter responses (HE+EN) + deterministic regex referral floor for crisis vocabulary + SDK-shaped wrapper interface. No LLM yet. Validates demand and forces the referral-floor design before SDK integration cost. ~1 week.
- **B. SDK-first.** Roy's Phase 0a Rust spike — measure Hebrew quality at 0.5B against `el-chat` / `QwenChatProvider` directly before any RN code. If Hebrew fails the gate, weeks of pointless RN work are saved. ~2-3 weeks to a working chatbot, first 1-2 weeks are pure measurement.

---

## Decisions

- **Privacy ceiling for any journal/log feature:** on-device only, no backend sync, no therapist visibility in v1. Same posture as crisis taps + trusted contacts.
- **Directional lean (Omer, 2026-06-29):** build the chatbot, "aware of its limitations" (referral path + boundary spec). Final path (A vs B vs deferred) not yet picked — see open questions.

---

## Structural blockers — chatbot direction

These were raised with Roy on WhatsApp 2026-06-25 and have not been resolved. They apply to either path A or B, and to any chatbot scope we ship:

1. **No validated demand.** No user research is cited in Roy's plan. "Personal AI companion" is a founder-instinct shape, not a tested need. Risk: 6–10 weeks of engineering on a feature veterans don't want.
2. **Legal / regulatory exposure.** A chatbot replying in natural language to PTSD veterans moves HearO from wellness toward medical-device classification under Israeli MoH framing. Character.AI litigation precedent is the right comparable. Insurance, MoH, and press scrutiny all increase the moment we cross that line.
3. **No clinical owner for the boundary spec.** "What is the chatbot allowed to say to a PTSD veteran" is clinical-policy work, not engineering work. Probably Hirschman. Without this written down before code lands, the safety story is "we trust a 0.5B model to follow a prompt contract."

Roy has not replied yet.

---

## Open questions

### 1. Which path next?

- **A.** Stub-first chatbot UX (1 week, no LLM yet)
- **B.** Roy's Phase 0a Rust spike — Hebrew quality gate first (~2-3 weeks)
- **C.** Pause, resolve the three structural blockers, then re-decide
- **D.** Skip the chatbot for now, ship the "right now" button + lightweight log instead

### 2. Boundary spec ownership

If we proceed with any chatbot path: who owns the boundary spec ("what the agent is allowed to answer, what gets referred")? Hirschman is the likely candidate. Engaging him is a prerequisite, not a follow-up.

### 3. Liability stance

Are we shipping a chatbot to PTSD veterans without a clinical sign-off? If yes, we need it written down somewhere (a paragraph in `docs/RATIONALE.md` or a separate `docs/liability-stance.md`) so the decision isn't being made in the moment after an incident.

---

## Carry-forward work

### Roy still owes (per `docs/roy-asset-brief.md`)

- 5 new scenarios end-to-end (visuals + voice + audio + calming)
- Calming-overlay variations (warm-piano, floating-pads — 3-4 takes each)
- Calming-protocol voice narration (validation / body-grounding / close × EN + HE = 6 clips)
- 3 trigger illustrations: baby-crying, dog, restaurant
- Transcripts of the existing voice recordings so we can reconcile `content.ts` script text with what was actually recorded (surfaced as a bug in v1.1.5 testing — `isVoicePlaying` now hides the script during playback as a workaround)

### Hirschman / clinical

- Clinical review of 14 daily affirmations (currently flagged `TODO(clinical-review)` in `src/lib/content/content.ts`)
- Real-HR spike-detection thresholds for the non-mock pulse path
- Boundary spec for the AI companion (if we proceed)

### Product calls still open

- Decide whether to ship the "right now" button independently of the chatbot direction (1 week, low risk, completes the in-the-moment loop)
- Decide whether to ship the lightweight journal (process-later half) independently of the chatbot direction
- Resolve the three chatbot blockers before any code lands on that surface

### Engineering debt / smaller items

- Android Health Connect adapter (`healthKit.android.ts`) — currently iOS-only
- Pull baby-crying / dog / restaurant from `triggerCandidates` until Roy ships illustrations (open product call)
- Consider scaling `AMBIENT_FADE_IN_RATIO` beyond 20% at the 3-minute setting (36s for baseline collection is tight)
- Reconcile `content.ts` script text with Roy's actual voice recordings once transcripts arrive

---

## Next action

Pending Omer's pick on Open Question 1 (which path) and Open Question 2 (boundary spec ownership). Once Roy replies to the WhatsApp blockers, this doc gets a follow-up section with his answers.

---

## Follow-up — 2026-06-29 evening

After the meeting-notes draft, we shipped a tactical pass on existing rough edges before re-engaging the chatbot direction. Captured here so the doc reflects what's actually in flight.

### Shipped (1.1.6 → 1.1.7)

**1.1.6:**
- `_layout` calls `Updates.reloadAsync()` when `I18nManager.forceRTL` toggles. Without it, the persisted RTL state only takes effect on the next manual launch on iOS — first launch after the 1.1.4 Hebrew-default upgrade left Hebrew text inside an LTR-laid-out screen.
- Audio engine ducks ambient -6 dB during voice playback (heavier than the -3 dB trigger duck since voice is meant to be the focal audio). New voice clips also cut any in-flight voice source — no more two-narrators-overlapping when a post-burst calming clip fires close to a mid-session voice.
- Reminder UI redesigned: Switch (on/off) + inline iOS time spinner. The previous change/turn-off link pair felt buried; the Switch makes on/off the headline control and the scroller lives underneath.
- `SceneCarousel` widened from 0.74 → 0.86 ratio (cap 320 → 380). Scene illustration no longer cropped to the middle of the screen.
- Hebrew copy fixes per tester feedback: `durationQuestion` ("מה יהיה אורך התרגול?"), `setup.ready` ("להתחיל"), psycho-ed "amygdala" → "the brain", "מרחב מוגן" → "מרחב בטוח".

**1.1.7 (in flight):**
- ERAN brand logo replaces the "Call ERAN 1201" text in `CrisisSheet`. Number stays visible below the logo for safety-critical clarity ("what am I about to dial?" must never be hidden behind iconography alone). Asset at `assets/images/eran-logo.webp`.

### Pending — needs input

- **UX/UI expert comments.** Omer flagged we have feedback from a UX/UI reviewer that should be folded in here. Awaiting paste — when they arrive, they'll become a new "UX/UI review — 2026-06-29" section below.
- **Broader Hebrew copy review.** Tester feedback called out that Hebrew across the app "isn't sensitive enough, not how we talk." Four specific strings were edited; the rest of `he:` strings in `src/lib/ui/i18n.ts` and `src/lib/content/content.ts` likely have the same drift. Needs a native-speaker pass (Roy or other reviewer) — implement after review.
- **Voice script transcripts.** Roy's recordings don't read the content.ts scripts verbatim. We worked around it by hiding the on-screen caption while voice plays (1.1.5), but the real fix is to update `content.ts` to match what was actually recorded. Blocked on Roy delivering transcripts.

### UX/UI review — placeholder

_(Awaiting comments from Omer's UX/UI reviewer. To be folded in here.)_
