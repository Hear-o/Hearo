# ADR-003: Make trigger intensity and cadence user-configurable

- **Status**: proposed
- **Date**: 2026-08-27
- **Deciders**:
- **Tags**: audio, settings, accessibility, exposure-session, persistence

## Context

Hearo currently uses one fixed trigger profile for every exposure session:

- Trigger bursts peak at `-18 dB`.
- Bursts occur at one trigger per minute of the trigger zone.
- Session length determines the total trigger count and evenly spaced interval.

These values are constants in `src/app/session.tsx`. The audio engine already
accepts a peak gain and deterministic interval, but there is no user-facing way
to configure either value and no persisted trigger preference model.

A single fixed profile does not fit every user. Trigger sensitivity, device
output, headphones, and readiness for exposure vary. Users need to choose the
quietest and loudest points of a session and the pace at which trigger moments
arrive, while the app must keep those controls predictable and bounded. The
existing response to elevated distress—fading the active trigger and pausing the
scheduler—must continue to take precedence over any configured preference.

## Decision

### 1. Add a dedicated Trigger Sound settings page

Add a routed Trigger Sound page linked from the existing Settings sheet. The
page owns a draft preference and exposes:

1. Minimum volume.
2. Maximum volume.
3. Pace, expressed to the user as both a qualitative label and an approximate
   interval such as “about every 60 seconds.”
4. A one-shot “Test sound” action.
5. Reset to defaults, cancel/back, and explicit save actions.

The page is separate from `SettingsSheet` because range controls, explanatory
copy, preview state, validation, and accessibility labels need more space than
the general-purpose bottom sheet provides. All copy must be available in Hebrew
and English, and the layout must support RTL without reversing the meaning of a
low-to-high slider.

### 2. Persist one versioned, device-local preference

Store a global preference through the typed `src/lib/storage/storage.ts` seam:

```ts
type TriggerSoundPreference = {
  schemaVersion: 1;
  minimumPeakDb: number;
  maximumPeakDb: number;
  triggersPerMinute: number;
};
```

AsyncStorage remains the backing store. The preference is local to the device;
this decision does not add an account, network sync, or analytics payload.
Reads must validate and clamp every field so malformed or stale data cannot
reach the audio engine. A missing or invalid record falls back to the legacy
profile:

```ts
{
  schemaVersion: 1,
  minimumPeakDb: -18,
  maximumPeakDb: -18,
  triggersPerMinute: 1,
}
```

Keeping both volume values at `-18 dB` preserves current playback exactly until
the user changes the setting.

### 3. Keep UI percentages separate from audio-domain values

The page may display volume as an approachable percentage, but persistence and
playback use decibels. UI percentages map into a centrally defined safe gain
envelope. Initially:

- Quietest allowed peak: `-36 dB`.
- Loudest allowed peak: `-18 dB`.
- `minimumPeakDb` must be less than or equal to `maximumPeakDb`.

The maximum remains the current on-device-reviewed peak. Increasing it above
`-18 dB` requires a separate product/clinical review and device-level audio
validation; changing a UI percentage must never bypass that ceiling. The app
controls only the trigger layer's gain and does not attempt to change the
device's system volume.

### 4. Interpret min/max as a deterministic progression

For a session with more than one planned burst, interpolate the burst peak from
the configured minimum to the configured maximum by burst ordinal. The first
burst uses the minimum and the last uses the maximum. A one-burst session uses
the minimum.

This makes the range a graded exposure contract rather than random loudness.
Pausing for a heart-rate spike or manual distress does not advance the ordinal;
the next completed schedule slot resumes the same progression. Existing fade,
ambient ducking, lead-in, pause, and voice-interruption behavior remains
unchanged.

The audio engine should accept the range as scheduler configuration and compute
the current peak internally. Callers must convert dB to linear gain at the
audio boundary rather than storing linear gain in user preferences.

### 5. Model pace as triggers per minute

Persist pace as `triggersPerMinute`, initially bounded to `0.5–2.0`. The UI may
offer discrete, labeled steps within that range. The session derives a planned
burst count from the trigger-zone duration and the selected rate, with at least
one burst, then uses the existing fixed-interval scheduler and half-interval
first-burst placement.

The upper bound keeps enough separation for the existing 8-second peak,
1.5-second fade-in, 1.5-second fade-out, and 4-second lead-in sequence. It also
prevents a settings choice from creating overlapping bursts.

### 6. Snapshot preferences at session start

Read and validate the preference before entering the session, then snapshot it
alongside the existing duration-derived timing. Changes made after a session has
started apply only to the next session. Active session behavior must never
change because an AsyncStorage write completes or another screen edits the
preference.

The preview is the exception: it uses the unsaved draft so the user can assess
the proposed setting. It plays one currently selected trigger variation at the
draft maximum, stops any prior preview before starting another, and never starts
the session scheduler, ambient bed, or narration. Leaving the page stops and
disposes the preview audio.

## Alternatives Considered

### Keep fixed constants in the session screen

Rejected because it cannot accommodate differences in sensitivity, playback
hardware, or readiness, and every adjustment requires an application release.

### Put all controls directly in the existing Settings sheet

Rejected because the sheet already combines identity, language, reminders, and
pulse setup. Adding a two-value volume range, pace explanation, preview, and
validation would make the sheet crowded and harder to use with screen readers
or one hand.

### Persist percentages and convert them ad hoc

Rejected because a percentage has no stable audio meaning if the approved gain
envelope later changes. Persisted dB values give playback and migrations an
explicit contract while still allowing friendly percentage labels in the UI.

### Randomize every burst between minimum and maximum

Rejected because unpredictable loudness conflicts with the user's expectation
that minimum and maximum describe a controlled exposure progression. It also
makes preview, testing, and clinical review harder.

### Change the device's system volume

Rejected because it would affect ambient audio, narration, alerts, and other
applications. Hearo owns only the gain of its trigger layer.

## Consequences

### Positive

- Users can tailor trigger intensity and cadence without changing device volume.
- Defaults preserve current sessions for existing and new installations.
- Deterministic progression makes the chosen range understandable and testable.
- Versioned local persistence provides a migration path for future calibration.
- Session snapshots prevent mid-session preference races.
- Existing distress-driven pause and fade behavior remains authoritative.

### Negative

- The scheduler must support a per-burst peak instead of one fixed gain.
- Preview playback adds audio lifecycle and interruption handling to Settings.
- Percent-to-dB copy may require usability testing to avoid implying that the
  percentage is the device's absolute loudness.
- A global profile does not support per-trigger or per-scene tuning.

### Neutral

- The feature remains available on both iOS and Android through
  `react-native-audio-api` and therefore still requires a native development
  build; Expo Go is not supported.
- No new native dependency, permission, or cloud service is introduced.
- Device hardware and system volume still affect perceived loudness.

## Rollout and Verification

1. Add typed preference defaults, validation, and AsyncStorage accessors.
2. Add unit tests for missing, malformed, out-of-range, and versioned records.
3. Extend the scheduler and its fake-audio tests for min/max interpolation,
   one-burst sessions, pause/resume, and interval bounds.
4. Add the routed page, Settings link, EN/HE strings, RTL behavior, accessible
   values/actions, draft/save/reset behavior, and preview cleanup tests.
5. Verify that the legacy default produces the current `-18 dB` peak and one
   trigger per minute.
6. Run Jest and lint, then run the existing iOS device-level audio self-test.
7. Smoke-test preview and a complete session on native iOS and Android builds,
   including headphones, minimum/maximum constraints, distress pause, app
   backgrounding, and screen-reader output.
8. Mark this ADR accepted only after product/clinical review approves the
   labels and the initial safe gain and cadence envelopes.

## Links

- `src/app/session.tsx` — current fixed trigger peak and cadence derivation
- `src/lib/audio/audio-engine.ts` — trigger scheduler and gain graph
- `src/hooks/useAudioEngine.ts` — audio-engine lifecycle boundary
- `src/components/features/settings/SettingsSheet.tsx` — entry point to settings
- `src/lib/storage/storage.ts` — typed on-device persistence seam
- `.github/workflows/ios-audio.yml` — native iOS audio verification
