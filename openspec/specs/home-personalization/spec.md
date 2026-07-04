# home-personalization Specification

## Purpose
TBD - created by archiving change add-time-of-day-personalization. Update Purpose after archive.
## Requirements
### Requirement: Time-of-day greeting
The Home screen greeting SHALL reflect the device's local time-of-day, in the user's selected language.

#### Scenario: Morning
- **WHEN** the user opens the Home screen between 05:00 and 11:59 local time
- **THEN** the greeting reads "Good morning, {name}." (EN) or "בוקר טוב, {name}." (HE)
- **AND** when no name is resolvable, the greeting reads "Good morning." / "בוקר טוב." with no trailing comma

#### Scenario: Afternoon
- **WHEN** the user opens the Home screen between 12:00 and 17:59 local time
- **THEN** the greeting reads "Good afternoon, {name}." (EN) or "צהריים טובים, {name}." (HE)

#### Scenario: Evening
- **WHEN** the user opens the Home screen between 18:00 and 22:59 local time
- **THEN** the greeting reads "Good evening, {name}." (EN) or "ערב טוב, {name}." (HE)

#### Scenario: Night
- **WHEN** the user opens the Home screen between 23:00 and 04:59 local time
- **THEN** the greeting reads "Good night, {name}." (EN) or "לילה טוב, {name}." (HE)

### Requirement: Time-of-day default scene
Before the user has explicitly chosen a scene in Setup, the default scene returned by `getDefaultPreferences()` SHALL be derived from the device's local time-of-day.

#### Scenario: First launch in the morning
- **WHEN** the app launches between 05:00 and 11:59 and no scene preference is stored
- **THEN** the default scene resolves to `cafe`

#### Scenario: First launch in the afternoon
- **WHEN** the app launches between 12:00 and 17:59 and no scene preference is stored
- **THEN** the default scene resolves to `park`

#### Scenario: First launch in the evening
- **WHEN** the app launches between 18:00 and 22:59 and no scene preference is stored
- **THEN** the default scene resolves to `beach`

#### Scenario: First launch at night
- **WHEN** the app launches between 23:00 and 04:59 and no scene preference is stored
- **THEN** the default scene resolves to `road`

#### Scenario: User has already chosen a scene
- **WHEN** the user has previously selected a scene in Setup and the choice is persisted
- **THEN** the stored choice takes precedence over the time-of-day default
- **AND** the time-of-day default is not applied

