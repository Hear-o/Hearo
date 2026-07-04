## MODIFIED Requirements

### Requirement: No backend telemetry on crisis taps
The backend MUST never be informed when the crisis sheet is opened or when the patient taps `call ERAN`. No request MAY be sent to any server as a result of these actions. This guarantee SHALL hold regardless of whether the patient is therapist-linked or not. A patient under managed care MUST have the same crisis-tap privacy guarantee as a solo patient would have had — the therapist MUST NOT see crisis-sheet usage history through any surface of the dashboard.

#### Scenario: Backend audit (solo or linked patient)
- GIVEN any patient taps the `i` glyph and then taps `call ERAN`
- WHEN the backend logs and request history are inspected
- THEN no record of the crisis tap or the call exists for this patient

#### Scenario: Therapist dashboard audit
- GIVEN a patient is linked to a therapist
- WHEN the therapist navigates the patient's detail page
- THEN no crisis-event timeline or counter is visible anywhere on the dashboard
- AND no API path on the backend exposes crisis-tap history for any patient to any therapist

### Requirement: Secondary trusted-contact action
The crisis sheet MUST contain a secondary action labeled `a person you trust` (or its Hebrew equivalent) that opens the patient's nominated trusted-contact list. If no contacts are configured, the action MAY route to a stub that explains where to set them up. The trusted-contact list itself MUST remain on-device only. No part of the trusted-contact configuration MAY be uploaded to the backend, even for therapist-linked patients. The therapist MUST NOT see who the patient has nominated as trusted contacts.

#### Scenario: Trusted contacts configured
- GIVEN the patient has added one or more trusted contacts
- WHEN the patient taps `a person you trust`
- THEN the trusted contacts list opens
- AND tapping a contact starts a call to that contact

#### Scenario: No trusted contacts configured
- GIVEN the patient has not configured any trusted contacts
- WHEN the patient taps `a person you trust`
- THEN a brief stub explains how to add them later

#### Scenario: Trusted contacts never reach backend
- GIVEN a patient has added trusted contacts AND is linked to a therapist
- WHEN the backend storage is audited
- THEN no row, column, or jsonb field anywhere in the database contains any trusted-contact identifier for this patient
- AND no API path exposes the patient's trusted-contact list to the therapist
