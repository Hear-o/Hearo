## ADDED Requirements

### Requirement: Trusted contacts source is the device address book
The list of contacts shown under *a person you trust* SHALL be selected by the user from their device's address book via `expo-contacts`. The app MUST NOT collect contact data through any other channel (no manual entry of phone numbers, no import from external sources).

#### Scenario: User adds first trusted contact
- **WHEN** the user taps *a person you trust* with no configured contacts and selects "Add someone"
- **THEN** the system Contacts permission prompt appears
- **AND** on grant, a picker shows the user's address book entries
- **AND** the selected contact's stable ID is persisted via the local storage seam

#### Scenario: User opens crisis sheet with configured contacts
- **WHEN** the user opens the crisis sheet and contacts are configured
- **THEN** *a person you trust* expands to show the configured contacts, most-recently-added first
- **AND** tapping a contact launches the system dialer via `tel:` with that contact's primary number
- **AND** the app does not place the call itself

### Requirement: Contacts cap and listing
The configured-contacts list SHALL be capped at 5 entries and SHALL fit within the crisis sheet without scrolling.

#### Scenario: User tries to add a sixth contact
- **WHEN** the user has 5 contacts configured and attempts to add another
- **THEN** the add flow shows a quiet message that the list is full and offers to remove an existing one

### Requirement: Contact data stays on the device
Contact identifiers and any cached display data SHALL be stored only on the device. The app MUST NOT transmit contact information to any backend or third party. The app MUST NOT log when a trusted-contact call is initiated.

#### Scenario: Backend audit after a trusted-contact tap
- **WHEN** the user taps a configured trusted contact and the call is initiated
- **THEN** no record of the action exists in any backend log, analytics event, or telemetry stream owned by the app

### Requirement: Permission denial does not break the sheet
If the user denies the Contacts permission, the crisis sheet MUST continue to function with ERAN as the primary path, framed positively (not as a remaining option).

#### Scenario: User denies Contacts permission
- **WHEN** the user denies the Contacts prompt
- **THEN** the crisis sheet shows a quiet message explaining ERAN's role ("ERAN's trained for this. They answer day and night.")
- **AND** the *a person you trust* row is removed from the sheet
- **AND** the user is not re-prompted on subsequent crisis-sheet opens (until they explicitly try to add a contact via Settings, when that exists)
