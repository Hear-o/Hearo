## MODIFIED Requirements

### Requirement: Consent-bound trigger sounds
The session MUST only play trigger sounds present in the patient's **effective allowed list** at session start, computed as `therapist_enabled_sounds - patient_excluded_sounds` from the `consent_lists` table. The session MUST NOT introduce a sound that is not in this effective list. A consent change committed by the therapist while a session is in progress MUST NOT affect that session; the snapshot taken at session start is authoritative for its duration.

#### Scenario: Sound is consented
- GIVEN the patient's therapist-enabled list contains `motorcycle` and the patient has not excluded it
- WHEN the session enters the during phase
- THEN the motorcycle trigger sound plays layered over the ambient soundscape

#### Scenario: Effective consent list empty (all sounds self-excluded or therapist enabled none)
- GIVEN the effective allowed list at session start is empty
- WHEN the session runs through opening, during, and calming phases
- THEN no trigger sound is played at any point
- AND ambient and voice continue uninterrupted, giving the patient a rehearsal session without exposure
- AND the therapist dashboard shows a "needs attention" indicator on this patient

#### Scenario: Therapist edits consent mid-session
- GIVEN the patient has an active session in progress
- WHEN the therapist commits a consent change
- THEN the in-progress session continues with the consent snapshot taken at its start
- AND the next session opened by the patient uses the new consent state

## ADDED Requirements

### Requirement: Session records sync to backend when patient is linked
At the end of every completed session, the patient app SHALL upload a session record to the backend containing scene, sound (or null for rehearsal), therapist-set ceiling, actual peak intensity used, the full pulse curve as a sample blob, the patient's self-reflection answer, and the start/end timestamps. The upload SHALL happen post-session as a side effect; the session UX MUST NOT depend on the upload succeeding in real time.

#### Scenario: Linked patient completes a session
- WHEN the patient finishes a session and lands on the After screen
- THEN a session record is enqueued for upload to the backend
- AND the session record includes the pulse curve sampled during the session
- AND the upload is attempted in the background without blocking the After screen
- AND on success the session appears in the linked therapist's dashboard within seconds

#### Scenario: Upload retries when offline
- GIVEN a patient completes a session while the device is offline
- WHEN the device regains connectivity
- THEN the queued session record is uploaded
- AND no duplicate session record is created

### Requirement: Session records are limited to session-scoped data
The session-record upload MUST NOT include any data outside the bounds of the session itself. Specifically, it MUST NOT include trusted-contact identifiers, crisis-sheet interactions, app-open events, continuous (between-session) pulse, or any device-identification beyond what is needed for clinical attribution to the patient's account.

#### Scenario: Backend audit of session payload
- WHEN a session record is uploaded
- THEN the payload contains only: scene, sound, ceiling chosen, actual peak intensity, pulse curve during the session, reflection answer, timestamps, and patient id
- AND the payload contains no other fields
