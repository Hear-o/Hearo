## ADDED Requirements

### Requirement: One local daily reminder
The app SHALL schedule at most one local notification per day, at a user-chosen time. The schedule MUST be stored on the device only and MUST NOT require a backend.

#### Scenario: User enables reminders
- **WHEN** the user taps "Allow" on the Reminders row in Permissions
- **THEN** the system notification permission prompt appears
- **AND** on grant, a time picker appears with 18:00 local as the default
- **AND** on confirming a time, the daily reminder is scheduled locally and persisted

#### Scenario: Daily reminder fires
- **WHEN** the device's local clock reaches the configured reminder time
- **AND** the user has not disabled the reminder
- **THEN** a single notification fires with title and body in the user's selected language

### Requirement: Reminder copy is quiet
The notification body text SHALL be a single line, MUST NOT contain emoji, MUST NOT use urgency cues (exclamation points, "Don't forget", "Time to…"), and MUST stay in the journal voice of the rest of the app.

#### Scenario: English reminder text
- **WHEN** the daily reminder fires in English
- **THEN** the title reads "HearO"
- **AND** the body reads "A quiet walk is ready when you are."

#### Scenario: Hebrew reminder text
- **WHEN** the daily reminder fires in Hebrew
- **THEN** the title reads "HearO"
- **AND** the body reads "הליכה שקטה מחכה לך כשתהיה מוכן."

### Requirement: Tap opens Home, not Session
Tapping the daily reminder notification SHALL navigate the user to the Home screen, never directly to a Session.

#### Scenario: User taps notification
- **WHEN** the user taps the daily reminder notification from the lock screen or notification center
- **THEN** the app opens to the Home screen
- **AND** no Session audio starts automatically

### Requirement: Schedule re-asserts on app launch
On every app launch, the persisted reminder schedule SHALL be re-asserted with the OS scheduler so a single source of truth (the device's local store) governs whether and when the reminder fires.

#### Scenario: Re-assert after Android reboot
- **WHEN** the user reboots their Android device, which drops scheduled notifications
- **AND** the user launches the app
- **THEN** the previously configured daily reminder is re-scheduled with the OS without any user action

#### Scenario: User disabled reminders since last launch
- **WHEN** the persisted schedule has been cleared
- **AND** the user launches the app
- **THEN** no notification is scheduled
- **AND** any previously OS-scheduled notification for this app is cancelled
