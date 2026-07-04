## Why

The Home screen currently reads "Good evening, {name}." regardless of the actual hour, and the default scene is hard-coded to "park" regardless of whether it's morning or night. Both are device-pullable signals we're ignoring. Fixing them is the cheapest "the app feels alive" win on the board and continues the local-first pattern set up by `pull-name-from-device`.

## What Changes

- The greeting on Home follows the device's local hour: "Good morning" / "Good afternoon" / "Good evening" / "Good night" (and the Hebrew equivalents).
- The default scene returned by `getDefaultPreferences()` follows time of day instead of being a fixed `"park"`. Default mapping (overridable by the user via Setup, persisted via the local storage seam):
  - Morning (5:00–11:59) → `cafe`
  - Afternoon (12:00–17:59) → `park`
  - Evening (18:00–22:59) → `beach`
  - Night (23:00–4:59) → `road`
- Neither change touches anything else. Both work fully offline. No new permissions.

## Capabilities

### New Capabilities

- `home-personalization`: how the Home screen reflects the user and the moment. Today: time-of-day greeting + time-of-day default scene. Future: more contextual signals as we add them.

### Modified Capabilities

None. `exposure-session` continues to receive a scene from preferences; this change just makes the default smarter before the user has expressed a preference.

## Impact

- **New file**: `src/lib/timeOfDay.ts` — pure-function helpers (`getTimeOfDay()`, `getDefaultSceneForTimeOfDay()`).
- **Edited**: `src/lib/i18n.ts` (greeting keys per time-of-day band), `src/app/home.tsx` (use the new helper for greeting), `src/lib/content.ts` (`getDefaultPreferences` consults `timeOfDay`).
- No new dependencies. No network. No permissions.
