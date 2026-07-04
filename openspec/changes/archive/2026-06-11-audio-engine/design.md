## Context

Replacing `expo-audio` with a full Web Audio Graph. Three simultaneous layers. HR-driven adaptive gain. Five-state session machine. All constrained by Expo SDK 56, TypeScript strict, and the clinical parameters agreed with the team (all questions answered as of 2026-06-03).

## Goals / Non-Goals

**Goals:**

- Three-layer audio graph playable simultaneously without dropout or click artifacts.
- Trigger gain responds to real HR events (spike → fade, recovery + grace → resume).
- Voice clips duck the trigger cleanly.
- Session blocks until all audio assets are on-device (no streaming during therapy).
- Manual distress button works without a watch; 90-second auto-return.
- BLE disconnect: 8-second tolerance, then graceful freeze.
- Post-session questionnaire captured and available for Supabase storage later.

**Non-Goals:**

- Wiring Supabase storage for session feedback data (schema pending).
- HealthKit / Apple Watch integration (HealthKit ACL is a future change; `usePulseMonitor` uses the existing mock generator as fallback).
- Cross-session escalation logic (clinical decision pending with Dudi Efrati).
- Voice clip format conversion — format (MP3/MP4) handled at integration time, not in this design.

## Decisions

### Library: react-native-audio-api

The only React Native library that implements a full Web Audio Graph: `AudioContext`, `GainNode`, precise looping (`loopStart` / `loopEnd`), and background playback with screen off. `expo-audio` exposes none of these.

Risk: library is v0.12, relatively young. Mitigation: POC on real device before committing to the full implementation. If the POC fails, the fallback is `react-native-sound` for ambient + a custom gain interpolator, accepting the loss of precise looping.

Expo Go incompatibility is accepted — a dev build is required from this point forward.

### Audio Graph

```
AudioContext
├── BufferSourceNode (ambient) ──▶ AmbientGainNode (1.0) ──▶ destination
├── BufferSourceNode (trigger) ──▶ TriggerGainNode (0→ceil) ──▶ destination
└── BufferSourceNode (voice)   ──▶ VoiceGainNode (1.0) ──▶ destination
```

- **AmbientGainNode**: locked at 1.0. Never changes. Ambient loops continuously via `loop = true` + `loopStart` / `loopEnd` trimmed to avoid AAC encoder-delay artifacts.
- **TriggerGainNode**: starts at 0. Ramps logarithmically toward the dB ceiling using `setValueAtTime` + small-step scheduling. Responds to `PulseSpiked` and `PulseNormalized` events.
- **VoiceGainNode**: 1.0 while playing. On voice start: `TriggerGainNode.gain.setValueAtTime(0, ctx.currentTime)`. On voice end: `TriggerGainNode.gain.linearRampToValueAtTime(prevGain, ctx.currentTime + 1)`.

### Logarithmic Gain Curve

Perceived loudness is logarithmic (10 dB difference = 2× louder). A linear ramp from 0 to 1 sounds like a fast jump at the top. The trigger ramp uses a logarithmic schedule: small steps mapped to `Math.pow(10, (dB / 20))` where dB goes from −∞ to the ceiling dB. This makes the ramp perceptually even throughout the session.

dB ceilings (realistic distance ~3-5 m): motorcycle ~75 dB, baby cry ~65 dB. These map to gain values relative to the nominal audio file level — the audio team must normalize source files to a reference level (e.g. -18 dBFS) so gain = 1.0 reproduces the target dB on a calibrated device.

### Session State Machine

```
LOADING
  → (all assets on device) → DISCLAIMER
  → (voice clip 1 ends)    → AMBIENT_FADE_IN
  → (2 min elapsed)        → ADAPTIVE_LOOP
  → (session end or user exits) → WIND_DOWN
  → (voice clip 3 ends)    → POST_SESSION
  → (form submitted)       → After screen
```

State is held in a `useReducer` in `session.tsx`. Each state has an entry action and exit action. Crisis-sheet open suspends the clock and pauses audio at any state.

### HR Adaptive Logic (ADAPTIVE_LOOP state)

```
baseline = avg(HR readings during AMBIENT_FADE_IN)
spike    = HR ≥ baseline × 1.15, sustained ≥ 8 s
  → TriggerGain fades to 0 over 2-3 s
  → wait until HR ≤ baseline × 0.90
  → wait 30 s grace (ambient only)
  → resume TriggerGain at pre-spike level

gain curve = logarithmic, scheduled in 250 ms steps
ceiling    = scene/sound-specific dB target
```

Chronic high baseline (resting HR > 90 bpm): spike requires both HR crossing the threshold AND a manual distress button press. Single-source spike is logged but does not trigger the fade.

No-spike session: logged as `trigger_hr_outcome: "no_spike"`. No automatic escalation.

### Watch Disconnect

BLE gap detected in `usePulseMonitor`:

- < 8 s: no action, wait for reconnect
- ≥ 8 s: emit `WatchDisconnected` → freeze `TriggerGain` at current level, show in-session banner
- On reconnect: dismiss banner, resume adaptive loop from current gain

### Manual Mode (No Watch)

- Distress button press → `TriggerGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5)`
- Start 90 s countdown timer
- After 90 s → `TriggerGain.gain.linearRampToValueAtTime(prevGain, ctx.currentTime + 2.5)`
- Re-press during countdown → reset countdown, trigger stays at 0

Progress indicator shows remaining seconds. No HR-based logic in manual mode.

### Asset Cache

```
LOADING state:
1. Fetch CDN manifest (JSON: { url, sha256, size }[] per asset)
2. For each asset:
   a. If local file exists and SHA256 matches → skip
   b. Otherwise → download to expo-file-system cache dir
3. All assets ready → transition to DISCLAIMER
```

One basic ambient track is bundled in the app (`require(...)`) to allow a fallback if CDN is unavailable during LOADING. All other assets (trigger variations, additional ambient, voice clips) come from CDN.

### Post-Session Feedback

Held in local state, `useState` in the `POST_SESSION` state handler. Four questions:

1. How difficult was the session? (1-5 scale)
2. Did the trigger bother you? (yes / a little / no)
3. How do you feel compared to before? (better / same / harder)
4. Open text, optional

On submit: data available for `TODO(supabase): sessions feedback table` insertion. For now, passed to the After screen as route params or held in a lightweight store slice.

### Intensity Slider Integration

The existing `IntensitySlider` `ceiling` value maps directly to `TriggerGainNode`'s maximum gain. The auto-attenuation (HR spike) lowers gain below the ceiling but never above it. The slider's ghost indicator shows actual gain vs ceiling — this spec is already defined in `openspec/specs/intensity-control/spec.md` and is preserved.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| `react-native-audio-api` v0.12 instability | POC on real device before full implementation; fallback to `react-native-sound` |
| AAC encoder delay causes audible gap in ambient loop | Audio team produces files with matching fade-in/out at both ends; use `loopStart`/`loopEnd` to trim |
| Voice clip format (MP3/MP4) unknown | Integration deferred; `getVoiceClips()` returns a source shape that can wrap either format |
| HR lag (~10 s behind subjective distress) | Accepted — clinically legitimate per Q1; UX does not promise instant response |
| No HealthKit in this change | `usePulseMonitor` falls back to existing mock generator; HealthKit is a future ACL |
| CDN unavailable during LOADING | One bundled ambient track allows a limited "rehearsal walk" fallback |
