## ADDED Requirements

### Requirement: Ambient soundscape plays continuously throughout the session
An ambient audio track MUST play from `AMBIENT_FADE_IN` through `WIND_DOWN`, looping without audible gap. The ambient layer MUST NOT be affected by HR events, the intensity slider, or crisis-sheet open/close.

#### Scenario: Ambient unaffected by HR spike
- **WHEN** `PulseSpiked` is emitted during `ADAPTIVE_LOOP`
- **THEN** the ambient soundscape continues without change in volume or playback

### Requirement: Post-session feedback form shown before After screen
After `WIND_DOWN` completes, the session MUST present a short questionnaire (3-4 questions, maximum 4 screens) before routing to the After screen. The questionnaire MUST include: session difficulty (1-5 scale), trigger impact (yes / a little / no), mood change (better / same / harder), and an optional open-text field.

#### Scenario: Feedback form appears after session
- **WHEN** the `WIND_DOWN` state completes
- **THEN** the post-session feedback form is displayed
- **AND** the After screen is not shown until the form is submitted or skipped

### Requirement: Session screen shows watch status
The session screen MUST indicate whether a paired watch is connected. If no watch is paired at session start, the screen MUST show a message informing the user that the distress button controls trigger volume. If the watch disconnects during the session, a banner MUST appear within 8 seconds.

#### Scenario: No watch at session start
- **WHEN** the session starts and no watch is paired
- **THEN** the session screen shows "No watch detected. Use the button on screen to lower trigger volume when needed."
- **AND** the distress button is visible

#### Scenario: Watch disconnects mid-session
- **WHEN** the paired watch loses BLE connection for more than 8 seconds
- **THEN** a banner appears: "Watch disconnected. Use the distress button to control trigger volume manually."

## MODIFIED Requirements

### Requirement: Three named phases
The session MUST progress through five named states in order: `LOADING` (asset verification and download), `DISCLAIMER` (voice clip 1 plays), `AMBIENT_FADE_IN` (ambient establishes, HR baseline measured), `ADAPTIVE_LOOP` (trigger active, HR-driven), `WIND_DOWN` (all audio fades to zero, voice clip 3 plays). No state MAY be skipped or reordered.

#### Scenario: Phase progression
- **WHEN** a session begins
- **THEN** the states occur in the order: LOADING, DISCLAIMER, AMBIENT_FADE_IN, ADAPTIVE_LOOP, WIND_DOWN
- **AND** no state is bypassed

### Requirement: Early exit routes to After
The session MUST be exitable at any time via the × icon. Exiting MUST route the user to the After screen, not back to Home. Audio MUST fade to silence over 600ms on exit.

#### Scenario: User taps × mid-session
- **WHEN** the user taps the × icon during any active state
- **THEN** all audio fades to silence over 600ms
- **AND** the user lands on the After screen
- **AND** the partial session is recorded, not discarded
