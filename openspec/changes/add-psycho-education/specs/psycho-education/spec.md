## ADDED Requirements

### Requirement: First-session psycho-education screen
Before the user's first exposure session, the app SHALL show a one-time psycho-education screen that explains, in calm second-person prose, why exposure feels the way it feels — the amygdala stuck on "emergency settings" framing from Dr. Hirschman's source doc.

#### Scenario: First Begin press from Home
- **WHEN** the user is on Home, taps `Begin`, and `psychoEducationSeen === false`
- **THEN** the app navigates to `/psychoed`
- **AND** the screen renders the heading + body paragraphs + a single `Continue` action
- **AND** the trigger sound is not yet playing (no audio engine has been initialized)

#### Scenario: Continue from /psychoed
- **WHEN** the user taps `Continue` on `/psychoed`
- **THEN** `psychoEducationSeen` is set to `true`
- **AND** the app navigates to `/session` with the scene param, using `replace` semantics so `/psychoed` is not on the back stack

#### Scenario: Subsequent Begin press from Home
- **WHEN** the user is on Home, taps `Begin`, and `psychoEducationSeen === true`
- **THEN** the app navigates to `/session` directly, bypassing `/psychoed`

### Requirement: Bilingual content
The psycho-education content SHALL be available in both Hebrew (source) and English (translation), localised the same way as every other content surface.

#### Scenario: Hebrew device
- **WHEN** the device language is `he`
- **THEN** the heading, body paragraphs, and `Continue` label render in Hebrew, RTL-aligned

#### Scenario: English device
- **WHEN** the device language is `en` (or any non-Hebrew locale)
- **THEN** the heading, body paragraphs, and `Continue` label render in English, LTR-aligned

### Requirement: Re-readable from Setup
The user SHALL be able to re-read the psycho-education screen from the Setup screen, even after dismissing it on first run.

#### Scenario: Re-read link from Setup
- **WHEN** the user taps a "Re-read intro" link on `/setup`
- **THEN** the app pushes `/psychoed`
- **AND** the screen renders identically to the first-run case
- **AND** viewing it does not reset `psychoEducationSeen` to `false`

### Requirement: Crisis access preserved
The crisis affordance (`i` glyph in top-left) SHALL be present on `/psychoed`, behaving identically to its appearance on every other screen.

#### Scenario: Crisis tap from /psychoed
- **WHEN** the user taps the crisis affordance on `/psychoed`
- **THEN** the crisis sheet opens (same component, same behaviour as `crisis-access`)
