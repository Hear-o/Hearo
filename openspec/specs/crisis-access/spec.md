# crisis-access

## Purpose

A user in distress must be able to reach a human within one tap from anywhere in the app. The primary route is ERAN 1201 — Israel's free, 24/7, anonymous emotional first-aid hotline. The capability is a safety floor, not a feature: every other screen, animation, or pitch consideration must yield to this one working reliably. The UI for crisis access is deliberately quiet rather than alarming, because alarming UI in a crisis moment is itself activating for a traumatized user.
## Requirements
### Requirement: Crisis affordance on every screen
Every screen in the app MUST surface a crisis affordance — a small `i` glyph in the top-left of the screen. The affordance MUST use the letter `i`. It MUST NOT use `!`, `?`, `SOS`, red icons, or any alarm imagery.

#### Scenario: Welcome screen
- GIVEN the user is on the Welcome screen, before sign-in
- WHEN the user observes the top-left of the screen
- THEN a small `i` glyph is visible
- AND tapping it opens the crisis sheet

#### Scenario: Session screen
- GIVEN the user is mid-session with a trigger sound playing
- WHEN the user observes the top-left of the screen
- THEN the same `i` glyph is visible in the same position

### Requirement: Crisis sheet opens fast and offline
Tapping the crisis affordance MUST open the crisis sheet within 200ms. The sheet MUST NOT depend on any network resource and MUST work fully offline.

#### Scenario: Tap with no network
- GIVEN the device has no network connection
- WHEN the user taps the `i` glyph
- THEN the crisis sheet opens within 200ms
- AND the `call ERAN` action is present and tappable

### Requirement: Non-alarming headline
The crisis sheet headline MUST NOT contain the words `crisis`, `panic`, `emergency`, or `help` (or their Hebrew equivalents). The headline MUST be phrased as a quiet question.

#### Scenario: Headline content
- GIVEN the crisis sheet is open in English
- WHEN the headline is observed
- THEN it reads `Need someone to talk to right now?`
- AND it does not contain the words crisis, panic, emergency, or help

### Requirement: Call ERAN via tel URI
The primary action on the crisis sheet MUST be a phone call to ERAN 1201, invoked via the `tel:1201` URI so iOS handles the call directly. The app MUST NOT place the call itself.

#### Scenario: Primary action tapped
- GIVEN the crisis sheet is open
- WHEN the user taps the `call ERAN` action
- THEN iOS opens the phone dialer with 1201 prefilled
- AND the user can confirm the call from iOS

### Requirement: Secondary trusted-contact action
The crisis sheet MUST contain a secondary action labeled `a person you trust` (or its Hebrew equivalent) that opens the user's nominated trusted-contact list. If no contacts are configured, the action MAY route to a stub that explains where to set them up.

#### Scenario: Trusted contacts configured
- GIVEN the user has added one or more trusted contacts
- WHEN the user taps `a person you trust`
- THEN the trusted contacts list opens
- AND tapping a contact starts a call to that contact

#### Scenario: No trusted contacts configured
- GIVEN the user has not configured any trusted contacts
- WHEN the user taps `a person you trust`
- THEN a brief stub explains how to add them later

### Requirement: Session pauses, does not end
If the crisis sheet opens during an active session, the session MUST pause (audio fade-to-silence, animations frozen) rather than end. Dismissing the sheet MUST resume the session from where it paused.

#### Scenario: Pause and resume
- GIVEN the user is mid-session with audio playing
- WHEN the user taps the `i` glyph and the crisis sheet opens
- THEN the audio fades to silence over 200ms
- AND the breathing circle freezes
- AND when the user dismisses the sheet without calling, the audio resumes and the breathing circle resumes from where it paused

### Requirement: No backend telemetry on crisis taps
The backend MUST never be informed when the crisis sheet is opened or when the user taps `call ERAN`. No request MAY be sent to any server as a result of these actions.

#### Scenario: Backend audit
- GIVEN the user taps the `i` glyph and then taps `call ERAN`
- WHEN the backend logs and request history are inspected
- THEN no record of the crisis tap or the call exists for this user

### Requirement: Dismissible without action
The crisis sheet MUST be dismissable without the user being forced to choose any action. A `close` text link MUST be present at the bottom of the sheet.

#### Scenario: User dismisses
- GIVEN the crisis sheet is open
- WHEN the user taps `close`
- THEN the sheet slides down and disappears
- AND the user returns to the screen they were on

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

### Requirement: Bilingual parity
The crisis sheet MUST render in the user's selected language (English or Hebrew). All copy — headline, primary action, secondary action, supporting text, dismiss link — MUST be translated. Layout MUST mirror correctly under RTL.

#### Scenario: Sheet opens in Hebrew
- **WHEN** the user's device language is Hebrew and the user taps the `i` glyph
- **THEN** the sheet headline reads `צריך מישהו לדבר איתו עכשיו?` (or equivalent translated copy)
- **AND** the primary action reads `התקשר לער"ן 1201` (or equivalent)
- **AND** the layout flows right-to-left with the close link at the bottom-right margin

### Requirement: Sheet animation
The crisis sheet MUST slide up from the bottom of the screen on open and slide down on dismiss. The slide animation MUST complete within 600ms. The animation MUST NOT include bounce, overshoot, or any visual emphasis that reads as alarming.

#### Scenario: Open animation
- **WHEN** the user taps the `i` glyph
- **THEN** the sheet begins sliding up from the bottom of the screen within 200ms of the tap
- **AND** the sheet reaches its resting position within 600ms total
- **AND** the easing curve is monotonic (no overshoot or bounce)

#### Scenario: Dismiss animation
- **WHEN** the user taps `close`
- **THEN** the sheet slides down off the bottom of the screen within 600ms
- **AND** the underlying screen becomes interactive again as soon as the sheet has fully dismissed

### Requirement: Affordance z-index
The `i` glyph MUST render above all other screen content, including scene background images and any session overlays. The affordance MUST remain visible and tappable even while modal animations or auto-attenuation transitions are in flight.

#### Scenario: Affordance during scene image load
- **WHEN** the Session screen is mounting and the scene background image is still loading
- **THEN** the `i` glyph is already visible and tappable in the top-left
- **AND** tapping it opens the crisis sheet regardless of the image load state

#### Scenario: Affordance during automatic attenuation
- **WHEN** the session is mid-animation, automatically lowering the trigger volume
- **THEN** the `i` glyph remains tappable
- **AND** tapping it pauses the session and opens the sheet without waiting for the in-flight animation to finish

