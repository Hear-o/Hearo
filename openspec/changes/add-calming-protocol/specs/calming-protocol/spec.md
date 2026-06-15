## ADDED Requirements

### Requirement: User-initiated calming protocol
The user SHALL be able to start a 5-step guided calming protocol from inside a session or from the Home screen. The protocol regulates the parasympathetic system and ends the session.

#### Scenario: Entry from session
- **WHEN** the user is on `/session` in the `during` or `calming` phase, and taps the "I need a moment" affordance
- **THEN** the audio engine fades out over ~600ms
- **AND** the app navigates to `/calming` via `replace` (no return to session from the back stack)

#### Scenario: Entry from home
- **WHEN** the user is on `/home` and taps the "Need a moment?" secondary button
- **THEN** the app navigates to `/calming` via `push` (back returns to Home)

#### Scenario: Entry not offered during opening phase
- **WHEN** the user is on `/session` in the `opening` phase (no trigger has played yet)
- **THEN** the "I need a moment" affordance is hidden
- **AND** the affordance becomes visible the moment the session enters `during`

### Requirement: Five-step protocol sequence
The protocol SHALL run five steps in this exact order, with no skip-step affordance.

1. **Validation** — text-only display of the script: "you're safe now, anxiety is a wave, this will peak and fall." Duration ~10s.
2. **Body grounding** — text-only: "if you're standing, sit. Feel your feet on the floor. Feel your weight in the chair." Duration ~10s.
3. **Box breathing** — animated circle, 2 cycles of (4s inhale / 4s hold / 4s exhale / 4s hold), with narrated phase prompts in the current language.
4. **Sensory grounding** — 3-2-1 sequence: 3 things you can see (~8s), 2 things you can hear (~8s), 1 thing you can touch (~8s).
5. **Close** — text-only: "the wave has passed. You did the work by staying. We'll continue another time." Duration ~10s.

#### Scenario: Protocol runs to completion
- **WHEN** the user enters `/calming`
- **THEN** the five steps render in order, each advancing automatically when its duration elapses
- **AND** the total elapsed time is approximately 80–100 seconds

#### Scenario: User-controlled exit
- **WHEN** the user is mid-protocol and taps the close affordance
- **THEN** the app navigates to `/home` via `replace`
- **AND** no session-end is recorded (the user did not finish the protocol)
- **AND** the always-present crisis affordance remains available as an overlay that does not cancel the protocol

#### Scenario: Swipe-to-advance
- **WHEN** the user is on any step and performs a horizontal pan of at least 60px
- **THEN** the protocol advances to the next step immediately, regardless of remaining timer
- **AND** if the swipe occurs on the final step, the protocol completes via the same path as natural completion

### Requirement: Box-breathing animation
The box-breathing step SHALL animate a circle that visually pulls the breath cycle: expand on inhale, hold at full, shrink on exhale, hold at empty.

#### Scenario: Single breathing cycle
- **WHEN** a cycle begins
- **THEN** the circle expands smoothly over 4s while the prompt reads "Breathe in"
- **AND** the circle holds at full size for 4s with the prompt "Hold"
- **AND** the circle shrinks smoothly over 4s with the prompt "Breathe out"
- **AND** the circle holds at empty for 4s with the prompt "Hold"

#### Scenario: Hebrew prompts
- **WHEN** the device language is `he`
- **THEN** the prompts read in Hebrew ("שאיפה", "החזקה", "נשיפה", "החזקה")

### Requirement: Protocol-ended session is recorded distinctly
A session that ends via the calming protocol SHALL be recorded with `endedBy: "calming-protocol"`, distinguishing it from natural completion (`"natural"`) and manual `×` exit (`"manual-exit"`).

#### Scenario: Protocol completes, routes to After
- **WHEN** the calming protocol's final step finishes
- **THEN** the most-recent session record's `endedBy` is set to `"calming-protocol"`
- **AND** the app navigates to `/after`
- **AND** the `/after` screen renders identically to other end-of-session paths (intentional — the user shouldn't feel labeled by which exit they used)

## MODIFIED Requirements

### Requirement: Session end pathways
A session SHALL end via exactly one of three pathways. The pathway is recorded in the session record but MUST NOT alter the post-session experience the user sees.

#### Scenario: Natural end
- **WHEN** the session reaches its natural duration (~6 minutes) without the user invoking calming or pressing `×`
- **THEN** `endedBy: "natural"` is recorded
- **AND** the app navigates to `/after`

#### Scenario: Manual exit
- **WHEN** the user presses the `×` affordance during a session
- **THEN** `endedBy: "manual-exit"` is recorded
- **AND** audio fades over 600ms
- **AND** the app navigates to `/after`

#### Scenario: Calming protocol
- **WHEN** the user taps "I need a moment" and the calming protocol runs to completion
- **THEN** `endedBy: "calming-protocol"` is recorded
- **AND** the app navigates to `/after`
