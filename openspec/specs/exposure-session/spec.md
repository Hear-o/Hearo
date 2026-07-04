# exposure-session

## Purpose

The core therapeutic loop of HearO. A user puts on headphones, taps **begin**, and is taken through a guided walk: an ambient soundscape, a voice narrating the scene, and after a calm opening period, a user-consented trigger sound layered into the ambient mix. The session monitors the user's pulse and the user's manual intensity setting throughout, and ends with a brief reflection.
## Requirements
### Requirement: Consent-bound trigger sounds
The session MUST only play trigger sounds the user has previously consented to during setup. The session MUST NOT introduce a sound the user has not added to their consented list.

#### Scenario: Sound is consented
- GIVEN the user has `motorcycle` in their consented sounds list
- WHEN the session enters the during phase
- THEN the motorcycle trigger sound plays layered over the ambient soundscape

#### Scenario: Empty consent list
- GIVEN the user's consented sounds list is empty
- WHEN the session runs through opening, during, and calming phases
- THEN no trigger sound is played at any point
- AND ambient and voice continue uninterrupted, giving the user a rehearsal walk without exposure

### Requirement: Three named phases
The session MUST progress through five named states in order: `LOADING` (asset verification and download), `DISCLAIMER` (voice clip 1 plays), `AMBIENT_FADE_IN` (ambient establishes, HR baseline measured), `ADAPTIVE_LOOP` (trigger active, HR-driven), `WIND_DOWN` (all audio fades to zero, voice clip 3 plays). No state MAY be skipped or reordered.

#### Scenario: Phase progression
- **WHEN** a session begins
- **THEN** the states occur in the order: LOADING, DISCLAIMER, AMBIENT_FADE_IN, ADAPTIVE_LOOP, WIND_DOWN
- **AND** no state is bypassed

### Requirement: No visible warning before triggers
The session MUST NOT display a popup, banner, countdown, or visible warning before a trigger sound plays. The only acceptable visual response to the trigger is a barely-perceptible accent flash on the breathing circle.

#### Scenario: Trigger arrives without warning
- GIVEN the session is in the opening phase
- WHEN the during phase begins and the trigger sound plays
- THEN no popup, banner, or alert appears on screen
- AND the breathing circle does a single 200ms accent flash that fades over 1200ms

### Requirement: Voice captions in display serif
Every spoken voice line MUST appear on screen as a caption in the display serif font, one line at a time, with fade-in and fade-out transitions.

#### Scenario: Voice line transition
- GIVEN the session is playing the opening voice line
- WHEN the voice transitions to the during script
- THEN the previous caption fades out
- AND the new caption fades in within 900ms

### Requirement: Breathing circle slows during calming
The breathing circle MUST animate at 4s inhale / 6s exhale during opening and during phases, and MUST slow to 5s inhale / 8s exhale during the calming phase.

#### Scenario: Pulse spike triggers slower breathing
- GIVEN the session is in the during phase with breathing at 4s/6s
- WHEN the user's pulse crosses the calming threshold
- THEN the breathing circle transitions to a 5s/8s cycle
- AND the voice transitions to the calming script

### Requirement: Continuous pulse display
The session MUST display the user's current pulse continuously, sourced from Apple Watch via HealthKit when available, and from the mocked pulse generator otherwise.

#### Scenario: Watch present
- GIVEN the user has an Apple Watch paired and HealthKit permission granted
- WHEN the session is running
- THEN the displayed pulse value reflects HealthKit's live heart rate

#### Scenario: No watch present
- GIVEN no watch is paired
- WHEN the session is running
- THEN the displayed pulse value comes from the mocked pulse generator following the phase-aware curve

### Requirement: Elapsed time only, no countdown
The session MUST display elapsed time as `m:ss` near the bottom of the screen. The session MUST NOT show a countdown timer or progress toward a target duration.

#### Scenario: Time display
- GIVEN the session has been running for 134 seconds
- WHEN the session screen is observed
- THEN the time indicator shows `2:14`
- AND no countdown, progress bar toward completion, or remaining-time value is shown

### Requirement: Early exit routes to After
The session MUST be exitable at any time via the × icon. Exiting MUST route the user to the After screen, not back to Home. Audio MUST fade to silence over 600ms on exit.

#### Scenario: User taps × mid-session
- **WHEN** the user taps the × icon during any active state
- **THEN** all audio fades to silence over 600ms
- **AND** the user lands on the After screen
- **AND** the partial session is recorded, not discarded

### Requirement: Crisis access from session
The session MUST surface the crisis sheet via a small `i` glyph in the top-left, reachable in one tap from any phase.

#### Scenario: Crisis tap during session
- GIVEN the session is in any phase with audio playing
- WHEN the user taps the `i` glyph
- THEN audio fades to silence over 200ms
- AND the breathing circle freezes mid-cycle
- AND the crisis sheet slides up from the bottom
- AND the session is paused, not ended

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

### Requirement: Auto-soften is driven by actual pulse, not script timing
The auto-soften behavior (voice softening, breathing-circle slowing, trigger-sound attenuation) during a session SHALL be triggered by the user's observed pulse crossing a configured threshold, not by the session script's phase clock. When real pulse is unavailable, the mocked phase-driven fallback MAY drive the behavior so the session is still runnable.

#### Scenario: Real watch paired, pulse crosses threshold
- **WHEN** the session is mid-trigger and the user's real heart rate crosses 105 bpm for two consecutive samples
- **THEN** the session enters the slow state (voice script switches to calming, breathing slows to 5s/8s, trigger attenuates)
- **AND** the transition is independent of the session's elapsed time

#### Scenario: Real watch paired, pulse normalizes
- **WHEN** the session is in the slow state and the user's heart rate stays below 90 bpm for three consecutive samples
- **THEN** the session exits the slow state and returns the trigger to the user's manual ceiling

#### Scenario: No watch paired
- **WHEN** no Apple Watch is paired or HealthKit permission was denied
- **THEN** the session falls back to the existing mock pulse generator
- **AND** auto-soften is driven by the script's pulsePhase, identical to today's behavior
- **AND** the session is otherwise unaffected (voice, breathing, audio all run normally)

### Requirement: Watch disconnect mid-session
If the Apple Watch disconnects during a session, the session SHALL continue without interruption by falling back to the mock pulse generator after a brief grace period.

#### Scenario: Watch loses connection mid-session
- **WHEN** the session has been receiving real heart-rate samples and no new samples arrive for 10 seconds
- **THEN** the session silently switches to the mock pulse generator
- **AND** the user sees a continuously updating pulse number (script-driven from this point)
- **AND** no popup or alert appears

### Requirement: Pulse stream stays on-device
Real heart-rate samples consumed during a session MUST NOT leave the device. Only the per-session sparkline summary persisted at session end MAY be stored locally on-device. No backend SHALL receive real pulse samples.

#### Scenario: Backend audit after a session with a real watch
- **WHEN** a session completes with real Apple Watch pulse driving the behavior
- **THEN** no record of individual heart-rate samples exists in any backend log, analytics event, or telemetry stream owned by the app
- **AND** the sparkline summary saved to the device's local storage is the only persisted record

