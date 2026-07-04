## ADDED Requirements

### Requirement: Invite-only patient onboarding
The HearO mobile app SHALL NOT allow self-signup as a patient. The app's first-launch experience MUST gate the entire onboarding behind an invite token issued by a verified therapist. A user opening the app without a valid invite SHALL see an "Ask your therapist for an invitation" screen and SHALL have access only to the crisis sheet from that screen.

#### Scenario: Cold open without an invite
- **WHEN** a new install opens the app for the first time and the system has no invite token in pending state
- **THEN** the app shows the "Ask your therapist for an invitation" screen
- **AND** the crisis affordance (`i` glyph) remains tappable from that screen
- **AND** no other onboarding flow is reachable

#### Scenario: Cold open via invite deep link
- **WHEN** the app is opened from the email's `hearo://invite/<token>` deep link
- **THEN** the app exchanges the token with the backend for an invite preview
- **AND** displays the inviting therapist's full name, license number, and the initial consent list
- **AND** prompts the patient to sign in with Apple or Google to confirm identity

### Requirement: Therapist issues invite by email
A verified therapist SHALL be able to invite a new patient by providing the patient's email, an initial display name for the patient (a name the welcome screen will use until the patient changes it), an initial allowed-sounds list, and an initial intensity ceiling. The backend SHALL generate a single-use invite token scoped to that email, store it with a 7-day expiry, and trigger an email delivery with the deep-link.

#### Scenario: Successful invite
- **WHEN** a verified therapist submits the invite form
- **THEN** a row is created in the invites table with token, email, expiry, and the therapist-provided initial values
- **AND** an email is delivered to the patient containing the deep link
- **AND** the dashboard shows the invite as `pending` in a section under that therapist's patient list

#### Scenario: Therapist invites an email that already has an active patient account
- **WHEN** the submitted email belongs to a patient already linked to any therapist
- **THEN** the request fails with a "patient already has an active link" message
- **AND** no new invite is created

#### Scenario: Invite expires unredeemed
- **WHEN** seven days pass after invite creation without the patient redeeming it
- **THEN** the invite token is marked expired and rejected for any subsequent redemption attempt
- **AND** the therapist's dashboard shows the invite as `expired` and offers a "Resend" action

### Requirement: Invite redemption matches identity to email
The token redemption flow MUST require the patient to sign in with Apple or Google. The identity returned from the OAuth provider MUST contain an email matching the email the therapist issued the invite to (case-insensitive). A mismatch SHALL reject the redemption and SHALL NOT create the patient account.

#### Scenario: Redemption with matching email
- **WHEN** the patient signs in via Apple/Google and the identity email matches the invite email
- **THEN** a patient account is created
- **AND** a `therapist_patients` row is inserted linking the patient to the issuing therapist
- **AND** the consent list is initialized from the invite's initial values
- **AND** the invite is marked redeemed and cannot be reused

#### Scenario: Redemption with mismatched email
- **WHEN** the patient signs in but the identity email does not match the invite email
- **THEN** the redemption is rejected with a clear message
- **AND** no patient account or therapist_patients row is created
- **AND** the invite remains in its current state (still redeemable by the correct identity until expiry)

### Requirement: Patient unlinking is reversible (re-link via fresh invite)
A patient SHALL be able to unlink from their current therapist from the in-app settings. After unlinking, the patient SHALL be returned to the "Ask your therapist for an invitation" gate; their account persists but no sessions sync to the prior therapist. The prior therapist SHALL retain read access to the patient's historical sessions with an "Unlinked" marker but receive no new session data.

#### Scenario: Patient unlinks themselves
- **WHEN** the patient confirms the unlink action in settings
- **THEN** the `therapist_patients` row is marked unlinked with a timestamp
- **AND** the patient's app returns to the invite-gate screen
- **AND** the therapist's dashboard shows the patient with an `Unlinked` indicator
- **AND** any new session attempted by the patient is blocked until a new invite is redeemed

### Requirement: Patient account deletion cascades
A patient SHALL be able to delete their account from in-app settings. Account deletion MUST hard-delete the patient's row, all their sessions, all their consent records, and all their therapist links. Historical session data previously visible to any therapist becomes unreadable after deletion.

#### Scenario: Patient deletes their account
- **WHEN** the patient confirms account deletion
- **THEN** the patient's row and all dependent records are hard-deleted in a single transaction
- **AND** the therapist's dashboard shows the patient as "Account deleted" without any session detail
