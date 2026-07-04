# audio-engine

## Purpose

The audio processing core of HearO. Manages three simultaneous audio layers — ambient soundscape, trigger sound, and voice overlay — through a Web Audio Graph with independent `GainNode` control per layer. Drives a five-state session machine and responds to HR events in real time.

## ADDED Requirements

### Requirement: Three simultaneous audio layers
The audio engine MUST play three audio sources simultaneously through a single `AudioContext`. Each layer MUST have its own `GainNode` so gain changes on one layer do not affect the others.

#### Scenario: All three layers active
- **WHEN** the session is in the `ADAPTIVE_LOOP` state and a voice clip begins
- **THEN** ambient continues at gain 1.0, trigger is silenced to 0, and voice plays at gain 1.0 simultaneously without dropout

### Requirement: Ambient layer locks at unity gain
The `AmbientGainNode` MUST be set to 1.0 at session start and MUST NOT be changed for any reason during the session, including HR spikes, user input, or crisis-sheet events.

#### Scenario: HR spike does not affect ambient
- **WHEN** `PulseSpiked` is emitted during `ADAPTIVE_LOOP`
- **THEN** `AmbientGainNode.gain` remains 1.0
- **AND** only `TriggerGainNode.gain` ramps toward 0

#### Scenario: Ambient loops without audible gap
- **WHEN** the ambient source reaches its end
- **THEN** playback continues immediately with no silence between repetitions

### Requirement: Trigger ramps logarithmically toward a dB ceiling
`TriggerGainNode.gain` MUST start at 0 at the beginning of `ADAPTIVE_LOOP` and ramp upward using a logarithmic schedule (perceptual loudness scale). The ceiling MUST be the scene/sound-specific dB target — motorcycle ~75 dB, baby cry ~65 dB — mapped to a gain value relative to a normalized source file level.

#### Scenario: Ramp is perceptually even
- **WHEN** the trigger has been ramping for half the session duration
- **THEN** the perceived loudness increase to that point is approximately equal to the remaining increase, not front-loaded

### Requirement: HR spike silences trigger gradually
When `PulseSpiked` is emitted, `TriggerGainNode.gain` MUST fade to 0 over 2-3 seconds using a linear ramp. The transition MUST NOT be an instant cut.

#### Scenario: Spike response timing
- **WHEN** `PulseSpiked` is emitted
- **THEN** `TriggerGainNode.gain` reaches 0 within 2-3 seconds
- **AND** the transition is audibly smooth (no click artifact)

### Requirement: Trigger resumes at pre-spike gain after recovery
After `PulseNormalized` is emitted AND a 30-second grace period of ambient-only has elapsed, `TriggerGainNode.gain` MUST resume ramping from the gain level at which the spike occurred — not from 0.

#### Scenario: Resume after recovery
- **WHEN** `PulseNormalized` is emitted and 30 seconds have elapsed
- **THEN** `TriggerGainNode.gain` returns to the pre-spike value and continues its logarithmic ramp toward the ceiling

### Requirement: Voice clips duck the trigger
When a voice clip begins playing, `TriggerGainNode.gain` MUST be set to 0 immediately. When the clip ends, `TriggerGainNode.gain` MUST ramp back to its pre-duck level over 1 second.

#### Scenario: Voice clip ducking
- **WHEN** the `DISCLAIMER` voice clip starts
- **THEN** `TriggerGainNode.gain` drops to 0 with no ramp delay
- **AND** when the clip finishes, gain ramps back to the pre-duck level over 1 second

### Requirement: Session MUST NOT start until all audio assets are on-device
The `LOADING` state MUST verify every required audio asset for the session exists in local storage and its SHA256 hash matches the CDN manifest. Missing or stale assets MUST be downloaded before the state transitions to `DISCLAIMER`. No audio asset MAY be streamed live during an active session.

#### Scenario: All assets present
- **WHEN** the session enters `LOADING` and all assets pass the SHA256 check
- **THEN** the session transitions to `DISCLAIMER` without any download

#### Scenario: Missing asset triggers download
- **WHEN** the session enters `LOADING` and one asset is absent from local storage
- **THEN** the app downloads the missing asset from CDN before transitioning
- **AND** the session screen shows a loading indicator until download completes

### Requirement: Five-state session machine
The session MUST advance through exactly these states in order: `LOADING → DISCLAIMER → AMBIENT_FADE_IN → ADAPTIVE_LOOP → WIND_DOWN → POST_SESSION`. No state MAY be skipped or reordered.

#### Scenario: Normal session progression
- **WHEN** a session begins
- **THEN** the states occur in the order: LOADING, DISCLAIMER, AMBIENT_FADE_IN, ADAPTIVE_LOOP, WIND_DOWN, POST_SESSION
- **AND** no state is bypassed

### Requirement: Baseline HR measured during AMBIENT_FADE_IN
The session MUST calculate a per-session HR baseline as the mean of all HR readings collected during the `AMBIENT_FADE_IN` state (~2 minutes). This baseline MUST be used as the reference for spike detection in `ADAPTIVE_LOOP`.

#### Scenario: Baseline established
- **WHEN** `AMBIENT_FADE_IN` ends
- **THEN** the engine has a `sessionBaseline` value in BPM derived from readings taken during that state

### Requirement: Spike detection requires sustained elevation
A `PulseSpiked` event MUST only be emitted when HR exceeds `sessionBaseline × 1.15` continuously for at least 8 seconds. Transient HR increases below 8 seconds MUST NOT trigger a spike.

#### Scenario: Short spike ignored
- **WHEN** HR rises above baseline × 1.15 for 6 seconds then drops
- **THEN** `PulseSpiked` is NOT emitted

#### Scenario: Sustained spike detected
- **WHEN** HR exceeds baseline × 1.15 for 10 continuous seconds
- **THEN** `PulseSpiked` is emitted

### Requirement: Manual distress button silences trigger and starts 90-second countdown
When the user presses the distress button in the absence of HR data (no watch, or watch disconnected), `TriggerGainNode.gain` MUST fade to 0 over 2-3 seconds and a 90-second countdown MUST start. When the countdown ends, `TriggerGainNode.gain` MUST ramp back to its pre-press level.

#### Scenario: Distress button manual mode
- **WHEN** the user presses the distress button and no watch is connected
- **THEN** trigger fades to 0 over 2-3 seconds
- **AND** a countdown indicator shows 90 seconds remaining
- **AND** after 90 seconds, trigger ramps back to its previous level

#### Scenario: Re-press resets countdown
- **WHEN** the user presses distress again while the countdown is active
- **THEN** the countdown resets to 90 seconds
- **AND** trigger remains at 0

### Requirement: BLE disconnect freezes adaptive loop after 8 seconds
If the paired watch loses BLE connection, the engine MUST wait 8 seconds before reacting. If the watch reconnects within 8 seconds, nothing changes. After 8 seconds without reconnection, `TriggerGainNode.gain` MUST freeze at its current level and the adaptive loop MUST pause.

#### Scenario: Short disconnect ignored
- **WHEN** BLE connection drops for 5 seconds then reconnects
- **THEN** `TriggerGainNode.gain` is unchanged and adaptive logic continues

#### Scenario: Long disconnect freezes adaptive loop
- **WHEN** BLE connection drops for more than 8 seconds
- **THEN** `TriggerGainNode.gain` holds at its current value
- **AND** the session displays a watch-disconnected banner
- **AND** the user can control trigger volume via the distress button

### Requirement: Voice clips play at three defined session moments
Three pre-recorded voice clips MUST play through `VoiceGainNode`: `DISCLAIMER` at the start of `AMBIENT_FADE_IN`, `MID_SESSION` at 50% of elapsed session time, `WIND_DOWN` after all audio fades to zero in the `WIND_DOWN` state. Each clip MUST duck `TriggerGainNode` while it plays.

#### Scenario: MID_SESSION clip timing
- **WHEN** elapsed session time reaches 50% of the total session duration
- **THEN** the `MID_SESSION` voice clip begins playing
- **AND** `TriggerGainNode.gain` drops to 0 for the clip's duration

### Requirement: Crisis-sheet open pauses the audio engine
When the crisis sheet is opened, the audio engine MUST pause all audio output (ambient, trigger, voice). When the crisis sheet closes, the engine MUST resume from where it paused. Elapsed session time MUST NOT advance while the crisis sheet is open.

#### Scenario: Crisis sheet pause and resume
- **WHEN** the user opens the crisis sheet during `ADAPTIVE_LOOP`
- **THEN** all audio stops immediately
- **AND** the session timer freezes
- **AND** when the crisis sheet closes, audio resumes and the timer continues
