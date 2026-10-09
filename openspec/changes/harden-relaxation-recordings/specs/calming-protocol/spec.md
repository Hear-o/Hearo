# Calming protocol

## Purpose

Provide a user-controlled break from practice with localized relaxation recordings and reviewed visual calming guidance that remains available when listening is impossible.

## ADDED Requirements

### Requirement: Localized relaxation recording
The calming route SHALL automatically play the supplied recording in the app's language, choosing Hebrew for Hebrew locales and English otherwise.

#### Scenario: Enter a break
- **WHEN** the user enters `/calming` from Home or the session
- **THEN** the localized recording starts after loading, with a loading indication followed by playback controls

#### Scenario: Change language
- **WHEN** the selected recording language changes during playback
- **THEN** the previous recording stops and a new localized recording loads from the beginning

### Requirement: Always-available reviewed visual guidance
The calming route SHALL offer the existing reviewed five-step visual protocol at all times, including while the recording loads, plays or is paused. Choosing visual guidance SHALL stop the recording. Visual guidance SHALL be available without audio or network access and SHALL NOT be presented as a transcript of an unverified recording.

#### Scenario: User cannot hear narration
- **WHEN** the user selects visual guidance
- **THEN** narration stops and validation, body grounding, animated box breathing, 3-2-1 sensory grounding and closing text are available in the app's language

#### Scenario: Return to narration from visual guidance
- **WHEN** the user chooses Play recording while using visual guidance
- **THEN** localized narration starts again without leaving the calming route
- **AND** the visual protocol keeps its current step
- **AND** its instructions are hidden and step timers stop while narration is selected; returning to visuals restarts the saved step's timer

#### Scenario: Audio cannot play
- **WHEN** activation, decoding, suspension or resumption fails
- **THEN** the recording stops, an error with retry appears, and the reviewed visual protocol appears automatically
- **AND** the route remains open until the user exits or completes the visual protocol

#### Scenario: Retry while following visual guidance
- **WHEN** the user retries audio after visual fallback has begun
- **THEN** the visual protocol saves its current step but hides instructions and stops timers during loading and playback
- **AND** failure restores the saved visual step; successful narration completion shows the completion screen

### Requirement: Reliable playback controls
The route SHALL expose pause, resume and retry controls. Failed activation or native state transitions SHALL be represented as errors. Old playback operations SHALL NOT change a newer recording's state or cause navigation.

#### Scenario: Resume activation fails
- **WHEN** audio session activation fails during resumption
- **THEN** the route displays the audio error and visual guidance instead of indicating playback

#### Scenario: Rapid control changes
- **WHEN** the user pauses while a resume is still pending
- **THEN** playback settles in the paused state

#### Scenario: Old operation rejects
- **WHEN** a previous recording's decode or state transition rejects after a retry, language change or route exit
- **THEN** the current recording and navigation are unaffected

### Requirement: Crisis suspension and background listening
Crisis support SHALL suspend narration and disable recording controls while preserving manual pause intent. Backgrounding SHALL NOT pause narration. Foreground recovery SHALL leave healthy running narration untouched and recover suspended contexts without a requested pause. Native interruptions SHALL latch a pause independently of context state and require explicit recovery. Resume SHALL remain available even when no interruption ended event arrives.

#### Scenario: Crisis while manually paused
- **WHEN** the user closes crisis support after manually pausing narration
- **THEN** narration stays paused until the user resumes it

#### Scenario: Listen with screen locked
- **WHEN** the app becomes inactive or backgrounded
- **THEN** narration is not suspended by that state change

#### Scenario: Foreground with healthy narration
- **WHEN** the app foregrounds and the recording context is still running
- **THEN** no additional activation or resume call interrupts that recording

#### Scenario: Foreground with suspended narration and no interruption
- **WHEN** the app foregrounds with a suspended native context and no manual, support or system pause is requested
- **THEN** narration recovers on the existing source without restarting its position

#### Scenario: Support pause control
- **WHEN** crisis support is open
- **THEN** the recording control is disabled with a support-pause label and cannot change the user's manual pause intent

#### Scenario: Native interruption without automatic resumption
- **WHEN** a phone/Siri interruption or Android audio-focus loss is reported
- **THEN** the screen indicates interrupted narration and preserves its position
- **AND** explicit Resume probes recovery without waiting for an ended event or automatically claiming playback

#### Scenario: Interruption ended event is missing
- **WHEN** a native interruption began event arrives without a matching ended event
- **THEN** Resume remains available unless crisis support is open
- **AND** explicit recovery preserves position on success or shows retry and visual guidance on failure

#### Scenario: Misleading running state after interruption
- **WHEN** the app foregrounds after an interruption and its context still reports running
- **THEN** the screen still prompts for explicit Resume and does not claim playback
- **AND** explicit Resume recovers the existing source without restarting the recording

### Requirement: Pause and return navigation
Entering a break from a session SHALL preserve the paused session underneath. Successful recording/visual completion SHALL keep the calming route open with a completion message and an explicit return control. Only an explicit user exit SHALL return to the caller and allow the session to resume. Audio teardown and audio errors SHALL NOT be treated as successful completion.

#### Scenario: Finish guidance
- **WHEN** narration ends naturally or the final visual step completes
- **THEN** the route records the existing calming completion marker, stops playback and shows a completion message
- **AND** the route remains focused and the underlying session remains paused until the user explicitly exits

#### Scenario: Narration finishes while screen is locked
- **WHEN** narration finishes while the app is inactive or backgrounded
- **THEN** no navigation or navigation animation is scheduled by completion
- **AND** returning to foreground still shows the calming completion screen without resuming exposure audio

#### Scenario: User chooses to return
- **WHEN** the user taps Return or the close control
- **THEN** the app returns to the caller and a paused practice session may resume

#### Scenario: Exit or switch to visuals
- **WHEN** the user exits or chooses visual guidance
- **THEN** playback stops and no playback completion callback runs as a result of teardown
