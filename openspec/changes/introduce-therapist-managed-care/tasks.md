## 1. Phase 1 — Mock therapist UI (no backend yet)

- [ ] 1.1 Add `/therapist` Astro routes scaffolded under `web/src/pages/therapist/` (login placeholder, dashboard, patient detail, consent editor, notes). Use Base layout.
- [ ] 1.2 Create a `web/src/lib/mock-patients.ts` with 3-5 hard-coded patient records (name, last session, consent state, ~3 session records each, pulse curve as inline array).
- [ ] 1.3 Render the patient list at `/therapist/dashboard` from the mock data. Include "needs attention" markers per the spec (no sessions in 14 days OR empty effective consent list).
- [ ] 1.4 Render patient detail at `/therapist/patient/[id]` showing session history with pulse sparklines (inline SVG, no external chart lib), reflections, ceiling trend, and current consent state.
- [ ] 1.5 Render consent editor at `/therapist/patient/[id]/consent` as a toggle list. Form is non-functional in this phase (button shows "Mock — Phase 6 will wire this up").
- [ ] 1.6 Render therapist notes section as a list with a "Mock — Phase 3 wires this up" placeholder for the editor.
- [ ] 1.7 Add a `/therapist` landing page with sign-in/sign-up CTAs that route to placeholder routes for now.
- [ ] 1.8 `npm --prefix web run build` clean; manually verify each route renders without console errors.

## 2. Phase 2 — Supabase schema + RLS

- [ ] 2.1 Create a new Supabase project in the team's dashboard. Capture the project URL and anon key as Vercel + GitHub secrets.
- [ ] 2.2 Write migration SQL for the schema in `design.md` §Schema sketch — files under a new `supabase/migrations/` directory. Tables: `users`, `therapists`, `patients`, `therapist_patients`, `consent_lists`, `consent_changes`, `sessions`, `therapist_notes`.
- [ ] 2.3 Add RLS policies for every table. Patient-side: `SELECT/UPDATE` only own rows. Therapist-side: `SELECT` only linked-patient rows + their own writes. `therapist_notes` readable only by writing therapist.
- [ ] 2.4 Write a `supabase/seed.sql` with 3-5 synthetic users (one admin, one verified therapist, two pending therapists, three patients linked to the verified therapist) for local testing.
- [ ] 2.5 Apply migrations to the cloud Supabase project. Verify schema + RLS via the Supabase Studio inspector.
- [ ] 2.6 Add a `lib/supabase.ts` client in BOTH the React Native app (`src/lib/supabase.ts`) and the marketing site (`web/src/lib/supabase.ts`). Initialize with anon key from env.
- [ ] 2.7 Test RLS by running unauthenticated reads (must return empty), authenticated patient reads (must return self only), authenticated therapist reads (must return linked patients only).

## 3. Phase 3 — Therapist auth + admin verification

- [ ] 3.1 Wire Supabase auth on the therapist `/therapist/signup` page with email + password + name + license number. Insert `therapists` row on signup with `verification_status = "pending"`.
- [ ] 3.2 Wire `/therapist/login` and session middleware on Astro SSR endpoints.
- [ ] 3.3 Add the persistent "verification pending" banner per `therapist-role` spec for any therapist with non-verified status. Banner cannot be dismissed.
- [ ] 3.4 Build `/therapist/admin/pending-verifications` route. Lists pending therapists; admin sees license number and name; can click "Verify" or "Reject". Gated by an `is_admin` boolean on the `users` row (manually flipped via Supabase Studio for seed admin).
- [ ] 3.5 Persist verification action: write `verification_status`, `verified_at`, `verified_by` on the therapists row.
- [ ] 3.6 Migrate the dashboard from mock data to backend reads (still empty unless seed data was inserted). The patient list will be empty for a newly-verified therapist with no invites yet — render the empty-state CTA from Phase 1.

## 4. Phase 4 — Patient session sync (linked patients only)

- [ ] 4.1 In the patient app, add an auth flow gate on launch that checks for a stored Supabase session. If none, app is in invite-required mode (see Phase 5).
- [ ] 4.2 In `src/lib/storage/session-store.ts`, add a post-session hook that constructs the session record (scene, sound, ceiling chosen, actual peak, pulse blob, reflection, timestamps) and inserts it into the `sessions` table on Supabase.
- [ ] 4.3 Implement upload retry: if offline at session end, the record is queued in AsyncStorage and uploaded on next foreground.
- [ ] 4.4 Verify the per-spec "session payload contains ONLY session-scoped data" rule: no trusted contacts, no crisis events, no continuous pulse, no app-open telemetry. Add an integration test that constructs the payload and snapshots its allowed keyset.
- [ ] 4.5 Therapist dashboard: replace mock session list with real reads from Supabase scoped by the active `therapist_patients` link.
- [ ] 4.6 Pulse sparkline: render real pulse blobs from the backend in the patient-detail view.

## 5. Phase 5 — Invite flow end-to-end

- [ ] 5.1 Backend: implement invite issuance via a Supabase edge function or simple SQL function. Inputs: patient email, initial display name, initial therapist-enabled sounds, initial intensity ceiling. Output: signed token (single-use, 7-day expiry, scoped to email).
- [ ] 5.2 Email delivery: use Supabase Auth's existing email infrastructure for the invite email. Template includes therapist's name + license number + the deep link `hearo://invite/<token>` and a web-fallback URL.
- [ ] 5.3 Therapist dashboard: build the "Invite patient" form gated by verified status. Fields: email, initial display name, initial sound list (multi-select), initial intensity ceiling slider.
- [ ] 5.4 Therapist dashboard: pending-invites section showing invites issued but not yet redeemed; "Resend" action; "Cancel" action.
- [ ] 5.5 Patient app deep-link handling: register `hearo://` scheme; route `/invite/<token>` to a new InviteRedemption screen that calls a server function to preview the invite (returns therapist name + initial consent list).
- [ ] 5.6 Patient app InviteRedemption screen: shows therapist + initial plan; presents Apple/Google sign-in; on auth completion the redemption RPC validates email match, creates the patient row, the therapist_patients link, and the initial consent_lists row in one transaction.
- [ ] 5.7 Patient app cold-open gate: when no session and no pending invite token, show the "Ask your therapist for an invitation" screen with crisis affordance still tappable.
- [ ] 5.8 Patient app: replace the current Setup screen's scene/sound picker with a "Today's plan" preview pulled from `consent_lists`. Patient cannot edit the therapist-enabled list from this screen.
- [ ] 5.9 Patient app settings: "Unlink from therapist" action that marks `therapist_patients.unlinked_at` and returns the patient to the cold-open gate.
- [ ] 5.10 Patient app settings: "Delete account" action with confirmation modal; performs cascade delete via server function.

## 6. Phase 6 — Consent editor write-back

- [ ] 6.1 Therapist dashboard: wire the consent editor toggle list to write `consent_lists.therapist_enabled_sounds` on save. Every change inserts a row into `consent_changes` with the diff.
- [ ] 6.2 Therapist dashboard: intensity-ceiling slider on the consent editor that writes `consent_lists.intensity_ceiling`.
- [ ] 6.3 Therapist dashboard: render the patient's `patient_excluded_sounds` next to the therapist-enabled list as a "self-excluded" indicator per sound.
- [ ] 6.4 Patient app: add a "My plan" screen accessible from settings that shows therapist-enabled sounds and lets the patient toggle their own `patient_excluded_sounds`.
- [ ] 6.5 Patient app: at session start, fetch the latest `consent_lists` row from backend (with a 1-day cache fallback if offline). Compute the effective allowed list as `therapist_enabled - patient_excluded`. If empty, the session enters rehearsal mode per the modified `exposure-session` spec.
- [ ] 6.6 Patient app: persist the consent snapshot taken at session start in the local session state so mid-session therapist edits don't affect the running session.

## 7. Verification

- [ ] 7.1 `npx tsc --noEmit` clean on both the React Native app and the marketing site.
- [ ] 7.2 `npx expo export --platform web` bundles for the patient app.
- [ ] 7.3 `npm --prefix web run build` builds the marketing + therapist dashboard.
- [ ] 7.4 `npm run test:coverage -- --ci` passes including new tests for invite token validation, RLS-denied paths, session payload allowed-keyset.
- [ ] 7.5 `npx -y @fission-ai/openspec validate introduce-therapist-managed-care` passes.
- [ ] 7.6 Manual: therapist signs up → admin verifies → therapist invites patient → patient receives email → redeems via Apple sign-in → completes a session → therapist sees the session in their dashboard.
- [ ] 7.7 Manual: linked patient opens the crisis sheet and taps Call ERAN. Therapist dashboard shows no record of either action. Trusted contacts list is verified absent from any database table.
- [ ] 7.8 Manual: patient unlinks, then a new therapist invites them; new therapist's consent list overwrites therapist_enabled but patient_excluded persists.
- [ ] 7.9 Manual: patient deletes account; all their session records, consent rows, and therapist links are gone in a single transaction.

## 8. Privacy policy + docs update

- [ ] 8.1 Update `web/src/pages/privacy.astro` to describe the backend, what it stores per patient, what stays on device (trusted contacts, crisis taps, between-session pulse), the therapist's data-access scope, account deletion behavior, and the unlink flow.
- [ ] 8.2 Update `docs/prd.md` to reflect the managed-care model: solo mode removed, therapist-first onboarding, consent-list shifted to therapist authority, backend now required.
- [ ] 8.3 Update `docs/FRONTEND.md` setup-screen mockup section to reflect that the patient's setup is now the therapist-provisioned "Today's plan" preview.
- [ ] 8.4 Update `README.md` framing: HearO is a clinician-prescribed exposure-therapy tool, not a self-service app.
- [ ] 8.5 Update `docs/CONVENTIONS.md` to describe the Supabase data-access pattern (RLS-first, no client-side filtering as a security boundary, feature-hook wrappers).
