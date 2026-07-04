## Why

HearO today is a solo, local-first app where the patient self-selects scenes and sounds at setup. That works for hackathon demos but doesn't match the clinical reality of exposure-therapy practice: titration of which triggers a patient encounters, at what intensity, and how often, is a **clinician decision**, not a self-care choice. Without therapist control we can't responsibly ship to combat veterans whose triggers we don't get to choose right, and we can't safely expand the trigger library without someone qualified deciding who is ready for which sound. Adding therapist-managed care is the prerequisite for the product becoming clinically defensible — and for a clinician beta after the hackathon.

## What Changes

- **BREAKING**: Solo patient mode is removed. Every patient must be invited by a licensed therapist; the app gates the entire experience behind an invite. The existing self-service setup screen (where the patient picks scenes/sounds) goes away — replaced by a "Today's plan" preview reflecting what the therapist has provisioned.
- A new **therapist web dashboard** under `hearo-rho.vercel.app/therapist` (built on the same Astro stack as the marketing site). Therapists sign up with email + license number, are placed in a `verification_pending` state, and unlock once an admin manually approves them. They invite patients by email, view session history + pulse trends + reflections, and edit each patient's allowed-sounds list and intensity ceiling.
- A new **backend** (Supabase + Postgres + Row-Level Security) becomes a Day-1 dependency. Schema: `users`, `therapists`, `patients`, `therapist_patients`, `consent_lists`, `sessions`, `therapist_notes`. RLS enforces the privacy contract at the database layer.
- **Hard privacy boundary preserved**: trusted contacts, crisis-sheet taps, and continuous (non-session) pulse NEVER reach the backend, even for therapist-linked patients. The current crisis-access spec's no-logging guarantee extends unchanged to the managed-care model.
- **Consent-list authority shifts to the therapist** with patient veto. Therapist sets the ceiling of allowed sounds; patient can opt-out of any of them (subset only) but cannot add sounds the therapist hasn't enabled. Therapist dashboard shows which sounds the patient has self-excluded.
- **Sessions sync to the backend from the link forward only.** Pre-link local sessions stay on-device; no backfill. After link, every completed session uploads its scene, sound, ceiling chosen, pulse curve, and reflection.
- **One therapist per patient** for v1. Re-linking to a new therapist requires unlinking from the prior one; historical session data stays accessible to the prior therapist for clinical-record continuity but no new sessions sync to them.

## Capabilities

### New Capabilities
- `therapist-role`: licensed-therapist accounts with verification-pending gating, invite issuance, and admin approval workflow.
- `patient-invite`: invite-only patient onboarding via email link, account creation matched against the therapist-issued invite, and the "ask your therapist" gate for cold opens.
- `consent-management`: therapist-authoritative allowed-sounds list with patient subset-veto, intensity-ceiling control, and history of consent changes.

### Modified Capabilities
- `exposure-session`: add session-record upload (scene, sound, ceiling, pulse curve, reflection) to backend when patient is linked. Local-first behavior preserved for the in-session experience; sync is an additional post-session side effect.
- `crisis-access`: reaffirm that trusted contacts and crisis-sheet taps never reach the backend, even for therapist-linked patients. The existing no-logging guarantee extends unchanged.

## Impact

- **New code surface**: an Astro project (or Astro routes) under `hearo-rho.vercel.app/therapist/*` for the therapist dashboard. New `lib/supabase.ts` client on both mobile and web. New patient-side "Continue with invitation" entry point and removal of the self-service Setup screen.
- **Existing app rework**: the Setup screen's scene+sound picker is removed; replaced with a Home "Today's plan" surface populated from the therapist-provisioned consent list. The Permissions screen flow stays; the Welcome screen gains the invite-gating path.
- **New backend**: a Supabase project (free tier in v1) provisioned with the schema and RLS policies described above. Admin UI for license verification (lightweight; can be a single page on the therapist dashboard guarded by an `is_admin` flag).
- **Auth**: from Day 1 for all users. Apple/Google for patients; email/password for therapists.
- **Privacy footprint**: a new system that handles clinically sensitive data. Privacy policy needs an update covering what the backend stores, what stays on-device, how unlinking and account deletion cascade, and the therapist's role in data access.
- **Documentation**: PRD, RATIONALE, and FRONTEND.md all reference the solo-patient model and will need significant updates to reflect the new managed-care default.
- **Estimated effort**: 4-6 weeks to a working prototype, broken into 6 phases (mock therapist UI → schema + RLS → therapist auth → patient session sync → patient invite flow → consent editor write-back). Each phase ships independently and is reviewable.
- **Out of scope (deferred)**: multiple therapists per patient, automated license-registry integration, clinic / group-of-therapists tier, in-app messaging between patient and therapist, scheduled / recurring session prescriptions, audit logs for compliance review.
