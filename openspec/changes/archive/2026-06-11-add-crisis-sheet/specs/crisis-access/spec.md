## ADDED Requirements

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
