## ADDED Requirements

### Requirement: Therapist signup with license attestation
The therapist web dashboard SHALL allow a new licensed therapist to create an account by providing email, full name, and license number. After signup the account SHALL be created in a `pending` verification status, and the therapist SHALL be able to navigate the dashboard but MUST NOT be able to invite patients until verification status becomes `verified`.

#### Scenario: First-time therapist signs up
- **WHEN** a therapist submits the signup form with email, full name, and license number
- **THEN** an account is created with `verification_status = "pending"`
- **AND** a verification email is sent to the submitted address
- **AND** the dashboard is accessible but the "Invite patient" action is disabled with a "Verification pending" tooltip

#### Scenario: Therapist signs up with an email already in use
- **WHEN** a signup attempt uses an email already registered in the system
- **THEN** the request fails with a "this email is already registered" message
- **AND** no new account is created
- **AND** the existing account is unaffected

### Requirement: Admin manual verification of license
The system SHALL provide an admin-only route that lists therapists in `pending` status, displays their license number and name, and allows the admin to mark each as `verified` or `rejected`. The action SHALL record `verified_at` and `verified_by` on the therapist record. Verification status SHALL be enforced by the database, not only by the UI.

#### Scenario: Admin verifies a pending therapist
- **WHEN** an admin clicks "Verify" on a pending therapist row
- **THEN** the therapist's `verification_status` is updated to `verified`
- **AND** `verified_at` and `verified_by` are recorded
- **AND** the therapist's dashboard re-renders with the "Invite patient" action enabled

#### Scenario: A non-admin user attempts to access the verification queue
- **WHEN** a user without the `is_admin` flag visits the admin verification route
- **THEN** the request is rejected with a 403 response
- **AND** the underlying RLS policy on the therapists table denies the read

### Requirement: Verification-pending dashboard banner
A therapist with `verification_status = "pending"` SHALL see a persistent, non-dismissable banner across all dashboard pages that explains they are in verification review and clarifies that the invite-patient action is gated until verification completes.

#### Scenario: Pending therapist views the dashboard
- **WHEN** a therapist with `pending` status loads any dashboard page
- **THEN** a banner appears at the top of the viewport
- **AND** the banner text explains the review process and an estimated turnaround
- **AND** the banner cannot be dismissed by the therapist

### Requirement: Therapist views linked-patient list
A verified therapist SHALL see a dashboard listing of every patient currently linked to them. Each row SHALL show the patient's display name, the date of their last session (or "no sessions yet"), the most recent self-reflection answer, and a "needs attention" marker if the patient has self-excluded all sounds OR has not completed a session in the last 14 days.

#### Scenario: Therapist with linked patients
- **WHEN** a verified therapist opens the dashboard
- **THEN** a list of linked patients appears with one row per patient
- **AND** each row shows display name, last-session date, and last reflection

#### Scenario: Therapist with no linked patients
- **WHEN** a verified therapist with no patients opens the dashboard
- **THEN** an empty-state placeholder appears with a clear "Invite your first patient" call-to-action

#### Scenario: Patient triggers the "needs attention" marker
- **WHEN** a linked patient has excluded all sounds from their consent list, OR has not completed a session in the past 14 days
- **THEN** that row in the therapist's list shows a small "needs attention" indicator

### Requirement: Therapist views patient session detail
A verified therapist SHALL be able to navigate from their patient list into a per-patient detail view that shows every completed session for that patient, the pulse curve for each session as a sparkline, the scene and sound used, the intensity ceiling chosen, and the self-reflection answer. The detail view SHALL also show the current consent list (therapist-enabled minus patient-excluded) and a history of consent changes with timestamps and the user who made each change.

#### Scenario: Therapist opens patient detail
- **WHEN** a therapist clicks a patient row in their list
- **THEN** the patient detail page loads with session history and consent state
- **AND** sessions are ordered most-recent first

#### Scenario: Therapist views a single session's pulse
- **WHEN** the therapist hovers over or expands a single session
- **THEN** a pulse sparkline rendered from the stored sample blob appears
- **AND** the scene, sound, ceiling, and reflection are surfaced alongside it

### Requirement: Therapist private notes
A therapist SHALL be able to create, edit, and delete private notes attached to a specific patient. Notes SHALL be readable only by the therapist who wrote them and MUST NOT be visible to the patient or to any other therapist (including a future therapist if the patient re-links).

#### Scenario: Therapist writes a note
- **WHEN** a therapist saves a note on a patient's detail page
- **THEN** the note is persisted with the therapist's id and a timestamp
- **AND** subsequent loads of the patient detail page render the note

#### Scenario: Patient cannot see therapist's notes
- **WHEN** a patient (or anyone other than the writing therapist) attempts to read the note via any API path
- **THEN** the row-level security policy denies the read
- **AND** the note does not appear in any patient-side UI surface
