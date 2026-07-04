## ADDED Requirements

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
