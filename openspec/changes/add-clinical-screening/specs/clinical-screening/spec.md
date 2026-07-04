## ADDED Requirements

### Requirement: PC-PTSD-5 screening instrument
The app SHALL administer the PC-PTSD-5 (Primary Care PTSD Screen for DSM-5, VA NCPTSD, public domain) at onboarding. The instrument consists of one trauma-exposure question (yes/no) followed by five yes/no symptom items, scored as the count of "yes" responses (0–5).

#### Scenario: First launch reaches the screen
- **WHEN** the user finishes the Permissions screen on first launch and `getClinicalScreeningResult() === undefined`
- **THEN** the app navigates to `/screening`
- **AND** the first step renders the intro copy + the trauma-exposure question

#### Scenario: Subsequent launches skip the screen
- **WHEN** the user has a stored screening result (any of the three outcome states below)
- **THEN** the app skips `/screening` and routes to `/setup` directly

#### Scenario: Trauma-exposure = no
- **WHEN** the user answers "no" to the trauma-exposure question on step 1
- **THEN** the 5 PC-PTSD-5 items are NOT administered
- **AND** the outcome is computed as `no-trauma` (score 0)
- **AND** the result is persisted with `traumaExposure: false`, `answers: []`, `score: 0`, `outcome: "no-trauma"`
- **AND** the app skips step 2 and renders the no-trauma outcome (a brief acknowledgment), then routes to `/setup`

#### Scenario: Trauma-exposure = yes
- **WHEN** the user answers "yes" to the trauma-exposure question
- **THEN** the app navigates to step 2 (the 5 PC-PTSD-5 items)
- **AND** the Submit button on step 2 is disabled until all 5 items have a yes/no answer

#### Scenario: Below-threshold outcome
- **WHEN** the user submits step 2 with score < 3 (zero, one, or two "yes" responses)
- **THEN** the outcome is `below-threshold`
- **AND** the result is persisted with the full record (instrument, version, traumaExposure: true, answers, score, cutoff: 3, outcome, takenAt)
- **AND** the app renders a short acknowledgment + a Continue action that routes to `/setup`

#### Scenario: Above-threshold outcome
- **WHEN** the user submits step 2 with score ≥ 3 (three, four, or five "yes" responses)
- **THEN** the outcome is `above-threshold`
- **AND** the result is persisted with the full record
- **AND** the app renders the clinician-recommendation copy + a Mativ-referral placeholder + a "Continue anyway" action
- **AND** the Mativ deep-link target is a placeholder until G-01 lands; the affordance is disabled but visible (so the user sees the recommendation pathway exists)
- **AND** the "Continue anyway" action routes to `/setup`

### Requirement: Two-band outcome model
The result SHALL distinguish exactly three outcome states. The legacy four-band severity model (`mild | moderate | severe`) is dropped — research review confirmed it is not VA-published and was refuted in adversarial verification.

#### Scenario: Outcome enum
- **WHEN** the screening completes via any path
- **THEN** the stored `outcome` is exactly one of `"no-trauma"`, `"below-threshold"`, or `"above-threshold"`

#### Scenario: Cutoff
- **WHEN** the score is computed
- **THEN** the cutoff used is `3` (VA Prins et al., 2016 recommendation for high-sensitivity screening)
- **AND** the cutoff value is persisted in the result record (so a future threshold revision can be detected by version + cutoff comparison)

### Requirement: Advisory, not blocking
The above-threshold outcome SHALL be advisory. The user MUST be able to continue into `/setup` regardless of outcome. HearO is wellness-classified and does not refuse service based on screening; the gate surfaces a recommendation and offers a hand-off, the user decides.

#### Scenario: Above-threshold user continues anyway
- **WHEN** the user is on the above-threshold outcome screen and taps "Continue anyway"
- **THEN** the app navigates to `/setup` the same as a below-threshold user
- **AND** no separate session-time gate exists — the user can run sessions normally
- **AND** subsequent launches skip `/screening` (the result is persisted)

### Requirement: Bilingual content with clinical sign-off gating
Content SHALL be available in both Hebrew (draft, pending Hirschman review) and English (verbatim from the VA's PC-PTSD-5 PDF, public domain).

#### Scenario: Hebrew device
- **WHEN** the device language is `he`
- **THEN** the trauma-exposure question, 5 items, and outcome copy render in Hebrew, RTL-aligned

#### Scenario: English device
- **WHEN** the device language is `en`
- **THEN** the same content renders in English, LTR-aligned

#### Scenario: Hebrew clinical sign-off
- **WHEN** the Hebrew content has not been reviewed by Dr. Hirschman (today's state)
- **THEN** the source code MUST contain `TODO(hirschman-review)` comments on every Hebrew string in `content.ts`
- **AND** no production Hebrew release SHALL ship until those comments are resolved

### Requirement: Crisis access preserved
The crisis affordance (`i` glyph in top-left) SHALL be present on every step of `/screening`, behaving identically to its appearance on every other screen.

#### Scenario: Crisis tap from any screening step
- **WHEN** the user taps the crisis affordance during the screening
- **THEN** the crisis sheet opens (same component, same behaviour as `crisis-access`)
- **AND** the screening step state is preserved (the user can resume after closing the sheet)
