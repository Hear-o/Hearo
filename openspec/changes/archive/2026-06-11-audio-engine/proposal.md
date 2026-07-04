## Why

The current audio system cannot support the clinical architecture. `expo-audio` with `useAudioPlayer` gives us one audio track, played once, at a fixed moment in the session. The clinical design requires three simultaneous layers — ambient soundscape looping continuously, a trigger that ramps up and responds to the user's heart rate in real time, and a voice overlay that ducks the trigger while it plays. None of this is expressible in the current stack.

The session state machine is also wrong. Today the session advances on a hard-coded time script (`SCRIPT` in `session.tsx`). The clinical design advances on physiological signal: the calming phase is triggered by the user's pulse crossing a threshold, not a timer. The current code has a comment noting this gap (`docs/ddd/2-exposure-session.md`).

Two more features are absent from the current system entirely: a post-session feedback questionnaire (3-4 questions shown after the session ends) and a robust asset management layer (all audio must be on-device before a session starts — no live streaming during therapy).

## What Changes

- Replace `expo-audio` with `react-native-audio-api` (Software Mansion) — the only React Native library that implements a full Web Audio Graph with `GainNode`, precise looping via `loopStart`/`loopEnd`, and background playback with screen off.
- Build a three-layer `AudioContext` graph: `AmbientGainNode` (locked at 1.0), `TriggerGainNode` (HR-driven, logarithmic ramp), `VoiceGainNode` (one-shot clips, ducks trigger while active).
- Replace the time-scripted `SCRIPT` with a five-state session machine: `LOADING → DISCLAIMER → AMBIENT_FADE_IN → ADAPTIVE_LOOP → WIND_DOWN → POST_SESSION`.
- Wire real `PulseSpiked` / `PulseNormalized` events from `usePulseMonitor`, replacing the mock `PulsePhase` time-script.
- Add an asset cache layer: CDN manifest check + SHA256 freshness + local download via `expo-file-system`. Sessions block on `LOADING` until all files are ready.
- Add a post-session feedback form (3-4 questions) shown after `WIND_DOWN`, before routing to the After screen.
- Handle watch-absent and watch-disconnect scenarios: manual distress button with 90-second auto-return, BLE 8-second tolerance before freezing the adaptive loop.

## Capabilities

### New Capabilities

- `audio-engine`: the three-layer `AudioContext` graph, session state machine, HR-adaptive gain logic, voice ducking, and asset cache.

### Modified Capabilities

- `exposure-session`: session now advances on physiological signal and voice-clip triggers, not a time script. State machine replaces the `opening → during → calming` phase model. Ambient layer added. Post-session feedback added.
- `intensity-control`: the manual slider now controls the `TriggerGainNode` ceiling. Auto-attenuation is no longer a mock floor — it is the real HR spike response (2-3 s fade to zero, resume at pre-spike level after recovery + 30 s grace).
- `pulse-monitoring` (DDD only): real `PulseSpiked` / `PulseNormalized` event seam added; personalized per-session baseline replaces the fixed 105 bpm threshold.

## Impact

- **New files**: `src/lib/audio-engine.ts`, `src/hooks/useAudioEngine.ts`, `src/hooks/usePulseMonitor.ts`, `src/lib/asset-cache.ts`, `src/components/features/post-session/`
- **Modified**: `src/lib/content.ts` (ambient + voice clip types), `src/lib/pulse.ts` (event seam), `src/app/session.tsx` (state machine + new hooks), `docs/CONVENTIONS.md` (audio library row)
- **Deleted**: `src/lib/audio.ts` (replaced by `audio-engine.ts`)
- **Expo Go incompatible**: `react-native-audio-api` is a native module. A dev build is required for development and testing on device. Expo Go will not work for any session-related development after this change.
- **No schema change**: this change is entirely client-side. Supabase schema is unaffected.
