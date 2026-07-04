## MODIFIED Requirements

### Requirement: Slider controls trigger volume only
The manual slider MUST affect only the trigger sound volume via `TriggerGainNode`. `AmbientGainNode` and `VoiceGainNode` MUST be unaffected by slider movement.

#### Scenario: Drag does not affect ambient
- **WHEN** the user drags the slider to the softest position during `ADAPTIVE_LOOP`
- **THEN** the ambient soundscape continues at gain 1.0
- **AND** only `TriggerGainNode.gain` ceiling is updated

### Requirement: Slider is a ceiling, not a fixed level
The slider position MUST represent the maximum gain value the engine is allowed to apply to `TriggerGainNode`. The engine's automatic HR-spike response MAY lower `TriggerGainNode.gain` below the ceiling but MUST NEVER set it above the slider's position.

#### Scenario: HR spike response respects ceiling
- **WHEN** the slider is at 0.6 and `PulseSpiked` is emitted
- **THEN** `TriggerGainNode.gain` fades toward 0 (below the 0.6 ceiling)
- **AND** the slider thumb stays at 0.6
- **AND** a ghost indicator shows the actual gain position on the track

#### Scenario: Recovery ramp respects ceiling
- **WHEN** `PulseNormalized` is emitted after a spike with slider at 0.6
- **THEN** `TriggerGainNode.gain` ramps back toward 0.6 (the pre-spike level, which is ≤ the slider ceiling)
- **AND** gain never exceeds 0.6
