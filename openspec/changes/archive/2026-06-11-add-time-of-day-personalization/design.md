## Context

The existing local-first pattern (`lib/storage.ts` + `lib/displayName.ts`) reads device signals and caches them in AsyncStorage. Time of day is a strictly weaker signal — pure-function of `Date.now()` — so no caching is needed. Recomputed cheaply at render time.

The default-scene logic lives in `getDefaultPreferences()` in `lib/content.ts`. Today it returns a fixed object. After this change, the object's `scene` field is computed from current time of day. The function's signature is unchanged.

## Goals / Non-Goals

**Goals:**

- One source of truth (`lib/timeOfDay.ts`) that the greeting and the default scene both consult.
- Bilingual greeting strings — EN + HE — for each of the four bands.
- Pure functions, easily unit-testable.

**Non-Goals:**

- Personalizing by user history ("you usually walk in the morning, so the cafe is the default for you specifically"). That's a persisted-preference layer we don't have yet.
- Sunrise/sunset calculation. Calendar-hour bands are good enough.

## Decisions

### Four bands, not three or six

Five-band ("dawn / morning / afternoon / evening / night") is overkill for the visible difference it'd make. Three-band ("morning / afternoon / evening") would miss "good night" for very late sessions. Four bands map cleanly to our four scenes.

### Bands chosen for the typical user, not edge cases

5–12 / 12–18 / 18–23 / 23–5 — covers the typical waking day cleanly. Someone using the app at 3 a.m. gets "good night" with a quiet-road default, which is the right read.

### Recompute on render, not on mount

`Date` is cheap. Recomputing on every Home render means a session that crosses 18:00 transitions naturally next time the user returns home. No subscribing to a clock.

### Default scene logic lives in `content.ts`, not in the Home screen

`getDefaultPreferences()` is the seam that the session store calls on app boot. Centralizing the time-of-day → scene mapping there means any future surface (settings, onboarding) that consults defaults gets the same answer.

## Risks / Trade-offs

- **Risk:** Hebrew time-of-day phrases vary by speaker preference. → **Mitigation:** Use neutral standard forms (`בוקר טוב` / `צהריים טובים` / `ערב טוב` / `לילה טוב`). A native-speaker review pass is queued for the broader translation review anyway.
- **Trade-off:** Mapping evening to `beach` favors the "evening walk" aesthetic but might surprise users who associate beach with daytime. Accepted: it's a default that's one tap to change in Setup.
