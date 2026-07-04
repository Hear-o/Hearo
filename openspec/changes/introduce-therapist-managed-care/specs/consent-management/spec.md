## ADDED Requirements

### Requirement: Therapist authors the allowed-sounds list
For each linked patient, the therapist SHALL maintain a list of sounds the patient is allowed to encounter. The therapist's list SHALL be authoritative — the patient app MUST treat it as the upper bound on what can play during a session. The therapist SHALL be able to add or remove sounds from this list at any time. Each change SHALL be recorded in a history table with the therapist's id, a timestamp, and the before/after states.

#### Scenario: Therapist adds a sound to the patient's allowed list
- **WHEN** the therapist saves a change that adds a sound to the patient's allowed list
- **THEN** the patient's `consent_lists.therapist_enabled_sounds` array is updated
- **AND** a row is inserted into `consent_changes` capturing the diff
- **AND** the patient's app picks up the change the next time it loads consent state (next session start)

#### Scenario: Therapist removes a sound from the patient's allowed list
- **WHEN** the therapist removes a sound from the patient's allowed list
- **THEN** the array is updated and the change is logged
- **AND** the sound MUST NOT play during any subsequent session even if the patient previously consented to it

### Requirement: Patient can opt out (subset only)
The patient SHALL be able to opt out of any sound the therapist enabled by adding it to a separate `patient_excluded_sounds` list. The effective allowed list at session time SHALL be `therapist_enabled_sounds - patient_excluded_sounds`. The patient MUST NOT be able to add to `therapist_enabled_sounds` directly through any patient-side API surface; the RLS policy enforces this at the database layer.

#### Scenario: Patient opts out of a sound
- **WHEN** the patient toggles a sound off in their consent-preview screen
- **THEN** that sound is added to the patient's `patient_excluded_sounds` array
- **AND** the sound is removed from the effective allowed list at next session start
- **AND** the therapist's dashboard shows the patient has self-excluded this sound

#### Scenario: Patient attempts to add a sound the therapist hasn't enabled
- **WHEN** any client-side write attempts to add a sound to `therapist_enabled_sounds` from a patient session
- **THEN** the database row-level security policy denies the write
- **AND** the client receives an error response

### Requirement: Effective consent list is recomputed at session start
The patient app SHALL fetch the latest consent state (`therapist_enabled_sounds`, `patient_excluded_sounds`, `intensity_ceiling`) at session start, NOT continuously during the session. A consent change committed by the therapist while a session is in progress SHALL NOT affect that session; it SHALL apply at the next session start.

#### Scenario: Therapist edits consent mid-session
- **WHEN** the therapist commits a consent change while the patient has an active session running
- **THEN** the in-progress session continues with the consent state snapshot taken at its start
- **AND** the patient's next session uses the updated consent state

### Requirement: Intensity ceiling is therapist-authoritative with session-local override
The therapist SHALL set a per-patient intensity ceiling on a 0-1 scale. The patient's session SHALL use this ceiling as the upper bound on trigger sound volume. The patient SHALL be able to lower the ceiling further within an individual session via the intensity slider, but that session-level lower-bound SHALL NOT persist beyond the session — the therapist's authoritative ceiling re-applies at the start of the next session.

#### Scenario: Patient slides intensity down during a session
- **WHEN** the patient drags the intensity slider below the therapist-set ceiling during a session
- **THEN** trigger sound volume immediately drops to the new lower value for the remainder of that session
- **AND** the session record stores both the therapist-set ceiling and the patient's actual usage value
- **AND** the next session opens at the therapist-set ceiling, not the patient's last-session drag

### Requirement: Effective allowed list of zero is a rehearsal session
If the effective allowed list (`therapist_enabled - patient_excluded`) is empty at session start, the app SHALL still allow the session to run — as a rehearsal session with no trigger sound, only the ambient soundscape, voice, and breathing. The therapist dashboard SHALL surface this state as a "needs attention" marker.

#### Scenario: Patient opens a session with empty effective consent list
- **WHEN** session start computes an empty effective allowed list
- **THEN** the session runs in rehearsal mode: ambient + voice + breathing, no trigger sound
- **AND** the session record stores `sound = null`
- **AND** the therapist's dashboard alerts on this patient

### Requirement: Patient-excluded list persists across therapist changes
A patient's `patient_excluded_sounds` list SHALL persist when the patient unlinks from one therapist and re-links to a new one. The new therapist's authoritative `therapist_enabled_sounds` resets entirely at re-link, but the patient's prior self-exclusions remain in effect until the patient themselves removes them.

#### Scenario: Patient re-links to a new therapist
- **WHEN** a previously-linked patient redeems a new invite from a different therapist
- **THEN** the new therapist's initial allowed-sounds list overwrites `therapist_enabled_sounds`
- **AND** the patient's prior `patient_excluded_sounds` array is preserved unchanged
- **AND** the new therapist's dashboard shows which sounds the patient has self-excluded from day one
