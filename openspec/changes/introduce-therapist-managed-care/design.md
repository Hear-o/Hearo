## Context

HearO ships today as a self-contained React Native app: the user picks their own scenes and sounds at the Setup screen, sessions run locally, pulse and reflections stay on the device via AsyncStorage. There is no backend. The crisis sheet and trusted-contacts list are explicit privacy promises ("nothing leaves your phone unless you ask"; "we never log crisis taps") backed by the absence of a backend at all.

The plan to move HearO toward clinical defensibility — and to safely expand the trigger library beyond the small hackathon set — requires a licensed clinician deciding which patient is ready for which sound at what intensity. This change introduces a therapist role, an invite-only patient onboarding flow, and a Supabase backend that holds the data the therapist needs to make those decisions. It also removes the solo-patient path: managed care becomes the only mode.

The privacy promises that already define the product (crisis-tap not logged; trusted contacts on-device only; pulse only during sessions) survive intact and now live in the database layer (RLS) as well as the UI layer.

Stakeholders: combat-veteran patients (privacy-sensitive, skeptical of "wellness apps"), Israeli licensed therapists (need a working dashboard before they trust referring patients), HearO founders (need a model that can pass clinical scrutiny before a real beta).

## Goals / Non-Goals

**Goals:**
- A therapist can sign up, get verified by an admin, invite a patient by email, set the initial allowed-sounds list and intensity ceiling, and see that patient's session history and pulse trends after the patient runs a session.
- A patient can only enter the app via a therapist's invite. Once in, they can run sessions, opt out of any individual sound the therapist allowed, but cannot add sounds the therapist hasn't enabled.
- The privacy contract (crisis taps not logged; trusted contacts on-device; non-session pulse never reaches backend) is enforced at the database layer via RLS and at the client layer via what we choose to upload.
- Linking is reversible. Patient can unlink. Therapist's historical data on past sessions persists; no new sessions sync.
- Account deletion is real. Cascade removes patient sessions, consent history, etc.

**Non-Goals:**
- Multiple therapists per patient. v1 is one-to-one (per patient). A patient transferring care goes through unlink → new invite.
- Automated license verification via Ministry of Health registry. v1 is admin-manual review.
- Clinic / group-of-therapists tier (organizational accounts).
- In-app patient ↔ therapist messaging or scheduling.
- Backfilling sessions from local storage when a patient first links. We only sync session forward.
- Patient self-signup. The app cold-opens with an "ask your therapist for an invitation" gate; nothing else.
- Compliance frameworks (HIPAA, GDPR Art. 9 audit logs). The architecture should not preclude them — but v1 doesn't deliver them.

## Decisions

### Backend: Supabase + Postgres + RLS

Why Supabase over Firebase, custom Express+Postgres, or fully-managed-Hasura:
- Postgres native (we want relational data + transactions for invite + link flows; not eventual consistency).
- Row-level security policies are first-class. The privacy contract becomes database-enforced rather than relying on every client to behave.
- React Native and Astro both have first-party SDKs.
- Free tier sufficient for prototype (500MB DB, 50K MAU); known cost ceiling.
- Already named as the planned backend in the project's existing docs ([CONVENTIONS.md](../../../docs/CONVENTIONS.md)).

Alternatives considered: Firebase (NoSQL data model doesn't fit our session/consent records well), Convex (excellent DX but new vendor risk for clinical data), self-hosted Postgres + Hasura (operational overhead we don't need yet).

### Web stack: extend the existing Astro marketing site

The therapist dashboard lives at `hearo-rho.vercel.app/therapist/*`, served by the same Astro project that hosts the marketing site. Astro supports SSR endpoints for the few dynamic pages we need (login, patient detail). The patient-facing pages stay static; the therapist routes are SSR-mode islands.

Alternatives considered: separate Next.js project (more JS framework, more deploy targets, no real upside for our scale), build into the React Native app via react-native-web (web routes already work via expo export, but the desktop-class data UIs the therapist needs don't fit well into RN's UI primitives).

### Patient onboarding: email-token invite, not in-app code entry

Therapist enters patient's email → backend generates a secure invite token → patient receives an email with a deep-link `hearo://invite/<token>` plus a web fallback. Tapping the link opens the app (or web onboarding page if not installed), the app presents the therapist's name + license number + initial consent list, patient confirms identity (Apple/Google sign-in matched against invite email), account created and linked in one transaction.

Alternative considered: invite **code** the therapist reads aloud or sends via WhatsApp, patient types into the app. Simpler tech but error-prone for the user (typo a 6-character code under stress) and harder for backend to verify match-by-email. Going with token link.

### Consent model: therapist as authoritative author, patient as subset-veto

The `consent_lists` table stores two columns: `therapist_enabled_sounds[]` and `patient_excluded_sounds[]`. The patient's effective allowed list is `therapist_enabled_sounds - patient_excluded_sounds`. This way:
- Therapist's column is authoritative; their write is the source of truth.
- Patient's veto is recorded separately, never overwrites the therapist's intent.
- Therapist's dashboard shows both lists and surfaces the gap (so they know what the patient self-excluded and can talk about it).
- A re-link to a new therapist resets `therapist_enabled_sounds` but retains `patient_excluded_sounds` (the patient's "I'm not ready for fireworks" persists across therapist changes).

Alternative considered: a single column with provenance metadata per item. Cleaner data model on paper, much harder to reason about in the UI.

### Local-first on the patient side: kept as cache, not source of truth

The patient app continues to write session + consent + preferences to AsyncStorage during a session, then syncs to the backend after the session ends. This preserves:
- Session can run fully offline; sync is best-effort post-hoc.
- Pulse data buffered locally during the session, uploaded as a single blob at end.
- If the network is down at session end, the upload retries on next app foreground.
- The user-perceived latency of the session itself never depends on the backend.

Alternative considered: synchronous backend writes during the session. Bad fit — Render-like latency variability would impact UX during the most sensitive moments.

### License verification: admin-manual queue (v1)

Therapist submits license number + name at signup. A row goes into `therapists` with `verification_status = 'pending'`. The dashboard is fully navigable in pending state but the "Invite patient" action is gated behind verified status. An admin (omer + small team) sees a queue at `/therapist/admin/pending-verifications`, looks each up on the Ministry of Health registry by hand, and clicks Verify. This is the lowest-tech option that holds the safety bar; full registry integration is a follow-up change.

Alternative considered: instant self-verify (anyone calling themselves a therapist gets in). Unacceptable safety risk even in prototype — combat veterans are the audience and the cost of an impostor "therapist" provisioning the wrong sounds is real.

### Privacy contract enforced at DB layer

Three things hold the privacy line:

1. **Trusted contacts never touch the backend.** There is no `trusted_contacts` table. The data stays in `lib/storage/storage.ts` on-device only. RLS can't help here because the data isn't in the DB at all.
2. **Crisis-sheet taps never reach the backend.** No `crisis_events` table, no telemetry endpoint that logs the tap. Existing crisis-access spec's no-logging guarantee continues to hold by construction.
3. **RLS on every readable table.** Patients can only `SELECT` rows where `patient_id = auth.uid()`. Therapists can only `SELECT` patient rows where there's an active `therapist_patients` row linking them, AND only the columns the spec allows (we use Postgres views to hide sensitive columns rather than relying on `SELECT` listing discipline in the client).

### Schema sketch

```sql
-- Identity layer
users(id uuid pk, email text unique, role text check in ('patient','therapist','admin'), created_at, deleted_at)

-- Therapist record (1:1 with users where role='therapist')
therapists(
  user_id uuid pk references users,
  full_name text,
  license_number text,
  verification_status text check in ('pending','verified','rejected'),
  verified_at, verified_by
)

-- Patient record (1:1 with users where role='patient')
patients(
  user_id uuid pk references users,
  display_name text,
  invited_by_therapist uuid references therapists,
  invite_accepted_at
)

-- Active link (1:1 by patient_id; therapist can have many patients)
therapist_patients(
  therapist_id uuid references therapists,
  patient_id uuid unique references patients,
  linked_at, unlinked_at
)

-- Consent (1:1 per patient, current state)
consent_lists(
  patient_id uuid pk references patients,
  therapist_enabled_sounds text[],
  patient_excluded_sounds text[],
  intensity_ceiling float check between 0 and 1,
  updated_at, updated_by uuid references users
)

-- Audit trail of consent changes (for therapist UI showing history)
consent_changes(id, patient_id, changed_by, before jsonb, after jsonb, changed_at)

-- One row per completed session
sessions(
  id uuid pk,
  patient_id uuid references patients,
  scene text,
  sound text,
  ceiling_chosen float,
  pulse_samples jsonb,  -- [{t: ms_offset, bpm}, ...]
  reflection text check in ('still-here','shaken','steady'),
  started_at, ended_at
)

-- Therapist's private notes per patient
therapist_notes(id, therapist_id, patient_id, body, created_at)
```

RLS policies (representative subset):
- `sessions`: patient can `SELECT` their own; therapist can `SELECT` where `therapist_patients` row exists and active.
- `consent_lists`: patient can `UPDATE` only `patient_excluded_sounds`; therapist can `UPDATE` `therapist_enabled_sounds` and `intensity_ceiling`.
- `therapist_notes`: therapist read/write own only; patient cannot see.

## Risks / Trade-offs

- **[Risk] Backend dependency makes offline-first sessions impossible.** We mitigate by deferring all backend writes to post-session, and queuing uploads if offline. The session itself runs purely locally. Acceptable trade.
- **[Risk] Therapist verification by manual admin review doesn't scale and is impersonatable if an admin is sloppy.** Mitigation: tiny number of therapists in v1 (the founders' clinical network), every verification is double-checked, follow-up change wires real Ministry of Health integration before a public beta.
- **[Risk] Patient's effective allowed sounds (`therapist_enabled - patient_excluded`) can collapse to empty if patient excludes everything.** Mitigation: app surfaces this as "rehearsal walk — no triggers" rather than as an error. Therapist dashboard alerts when a patient has excluded all sounds.
- **[Risk] Email-token invite link can be intercepted (forwarded, leaked).** Mitigation: token is single-use, scoped to the email it was issued to, expires in 7 days. The first sign-in via the token must use Apple/Google with an email matching the invite. Forwarded tokens don't work because the new recipient's Apple ID won't match.
- **[Risk] Patient deletes account between therapist's sessions, therapist loses access to historical data.** Mitigation: cascade-delete is hard-delete only on patient request. Therapist's view of past sessions remains accessible via a "Patient unlinked" indicator if patient unlinks but doesn't delete. If patient deletes, the data is gone — that's the right call for privacy even at the cost of therapist record-keeping.
- **[Trade-off] We're adding a real backend with real PII. Hosting cost, attack surface, and compliance obligations all jump.** Mitigation: Supabase free tier is sufficient for v1, attack surface limited by RLS, compliance work tracked as a follow-up. Not deferrable past first real clinical use.
- **[Trade-off] Removing solo mode is a real product-market shrink.** Users who were trying HearO independently can no longer use it without a referral. Acceptable because the alternative — shipping unsupervised exposure therapy at scale — is the worse risk.

## Migration Plan

Because there are no production patients today (hackathon stage, no clinical beta yet), there is **no data migration** to plan. We deploy the new model fresh.

Deployment order:
1. Phase 1 (mock UI): build the therapist dashboard with hard-coded mock data. No backend yet. Validates UX.
2. Phase 2 (schema): provision Supabase project, apply schema + RLS, no clients connected yet.
3. Phase 3 (therapist auth): therapist signup, admin verification, dashboard reads real (empty) backend data.
4. Phase 4 (patient sync): patient app uploads session records when linked. Local-first cache preserved.
5. Phase 5 (invite flow): the email-token invite end-to-end. Patient onboards through it.
6. Phase 6 (consent editor): therapist's consent writes actually change the patient app's behavior.

Each phase is its own openspec change-on-this-change (or PRs against this change's tasks list). Rollback is per-phase: pause sync at Phase 4 by removing the Supabase client init; revert UI at Phases 1-3 by removing routes; for Phases 5-6 the cascade is more involved and we accept a higher rollback cost there.

## Open Questions

1. **Patient email collection** — therapist enters patient's email when inviting. Should the therapist also enter the patient's intended display name (the name on the welcome screen, "Good morning, X")? Or should the patient set their own display name on first sign-in? Currently leaning: therapist sets the initial display name during invite; patient can edit it from settings later.
2. **Sessions that started locally before the patient was linked** — drop them entirely (no backfill), or upload only the sparkline summary as a "before linking" historical bar in the therapist dashboard? Currently leaning: drop entirely. Simpler, matches the link-forward decision.
3. **Intensity ceiling** — therapist sets the *initial* ceiling, but the patient can manually slide down further during a session and that becomes the new persisted ceiling for that sound. Does the patient's slider-down also overwrite the therapist's intended ceiling, or does the therapist's value remain authoritative and re-apply next session? Leaning: patient slider sets a session-level local minimum but doesn't overwrite the therapist's set ceiling.
4. **Admin verification UI** — separate route under `/therapist/admin/*` guarded by an `is_admin` flag, or a separate tiny Vercel project for omer + team only? Leaning: same project, same auth, admin flag.
5. **Privacy policy update timing** — the current policy at `/privacy` doesn't describe a backend. We must update it BEFORE Phase 3 (therapist auth) goes live for real users, because that's when real PII first lands in the backend. Tracking as a hard prerequisite for Phase 3.
6. **What happens at session start if the therapist is mid-edit of the consent list?** The patient's app picks up consent at session start; what if therapist edits during the session? Leaning: snapshot at session start, ignore mid-session changes. The session is a coherent unit.
