## 1. Branch and library swap

- [x] 1.1 Install `react-native-audio-api` (Software Mansion) and remove `expo-audio` from `package.json`
- [x] 1.2 Update `docs/CONVENTIONS.md` audio library row from `expo-audio` to `react-native-audio-api`
- [x] 1.3 Update `AGENTS.md` to note that a dev build is required — Expo Go is incompatible after this change

## 2. Audio engine core

- [x] 2.1 Create `src/lib/audio-engine.ts`: initialize `AudioContext`, create `AmbientGainNode` (locked at 1.0), `TriggerGainNode` (starts at 0), `VoiceGainNode` (1.0), connect all to `destination`
- [x] 2.2 Implement ambient looping: `loop = true` with `loopStart`/`loopEnd` set to avoid AAC encoder-delay artifacts
- [x] 2.3 Implement logarithmic trigger ramp: schedule gain steps in 250 ms increments using `Math.pow(10, dB/20)` mapping
- [x] 2.4 Implement spike response: `TriggerGainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5)` on `PulseSpiked`
- [x] 2.5 Implement recovery resume: on `PulseNormalized` + 30 s grace, restore gain to pre-spike level
- [x] 2.6 Implement voice ducking: set `TriggerGainNode.gain` to 0 on voice clip start; `linearRampToValueAtTime(prevGain, ctx.currentTime + 1)` on end
- [x] 2.7 Implement pause/resume: stop all sources on crisis-sheet open, resume from saved positions on close

## 3. Audio engine React hook

- [x] 3.1 Create `src/hooks/useAudioEngine.ts` wrapping `audio-engine.ts`; expose `startSession`, `pauseAll`, `resumeAll`, `setTriggerCeiling(gain)`, `playVoiceClip(source)`, `currentTriggerGain`
- [x] 3.2 Ensure hook cleans up `AudioContext` on unmount

## 4. Pulse monitoring — real event seam

- [x] 4.1 Extend `src/lib/pulse.ts`: add `PulseSpiked` / `PulseNormalized` event types and emission logic based on the 15% / 8 s threshold rule
- [x] 4.2 Create `src/hooks/usePulseMonitor.ts`: collect HR readings during `AMBIENT_FADE_IN`, compute `sessionBaseline`, detect spikes, return `{ pulseBpm, spiked, normalized, watchConnected }`
- [x] 4.3 Add BLE disconnect detection: emit `WatchDisconnected` after 8 s of no HR readings
- [x] 4.4 Add chronic high baseline logic: require both HR threshold AND manual distress press for a `PulseSpiked` event when resting HR > 90 BPM

## 5. Asset cache

- [x] 5.1 Create `src/lib/asset-cache.ts`: fetch CDN manifest, check SHA256 of locally cached files via `expo-file-system`, download missing/stale assets, return ready signal
- [x] 5.2 Extend `src/lib/content.ts`: add `AmbientTrack` type, `VoiceClip` type, `getAmbientTrack()` getter, `getVoiceClips()` getter; add `TODO(supabase)` markers for CDN URL fields

## 6. Session state machine

- [x] 6.1 Rewrite `src/app/session.tsx`: implement `useReducer`-based five-state machine (`LOADING | DISCLAIMER | AMBIENT_FADE_IN | ADAPTIVE_LOOP | WIND_DOWN | POST_SESSION`)
- [x] 6.2 `LOADING` state: run `asset-cache.ts` check/download; show loading indicator; transition to `DISCLAIMER` on ready
- [x] 6.3 `DISCLAIMER` state: play voice clip 1 via `useAudioEngine`; begin ambient fade-in behind it; transition to `AMBIENT_FADE_IN` when clip ends
- [x] 6.4 `AMBIENT_FADE_IN` state: run `usePulseMonitor` baseline measurement for ~2 min; transition to `ADAPTIVE_LOOP` when baseline is established
- [x] 6.5 `ADAPTIVE_LOOP` state: start trigger ramp; connect `PulseSpiked`/`PulseNormalized` events to `useAudioEngine`; play `MID_SESSION` clip at 50% elapsed
- [x] 6.6 `WIND_DOWN` state: fade all layers to zero; play voice clip 3; transition to `POST_SESSION` when clip ends
- [x] 6.7 Connect `IntensitySlider` ceiling value to `useAudioEngine.setTriggerCeiling()` — slider remains visible across all active states

## 7. Watch disconnect and manual mode

- [x] 7.1 Show "No watch detected" message on session start when no watch is paired; distress button visible
- [x] 7.2 Show "Watch disconnected" banner when `WatchDisconnected` event fires; dismiss when reconnected
- [x] 7.3 Wire distress button in manual mode: trigger fade to 0, start 90 s countdown, restore gain after countdown
- [x] 7.4 Add progress indicator showing remaining seconds of the 90 s countdown
- [x] 7.5 Re-press resets countdown to 90 s (trigger stays at 0)

## 8. Post-session feedback

- [x] 8.1 Create `src/components/features/post-session/` feature folder with `index.ts`
- [x] 8.2 Create feedback screen: 4 questions (difficulty 1-5, trigger impact, mood change, open optional text)
- [x] 8.3 Wire `POST_SESSION` state → feedback screen → After screen
- [x] 8.4 Add `TODO(supabase)` marker for feedback data persistence (schema pending)

## 9. DDD and OpenSpec alignment

- [x] 9.1 Update `docs/ddd/2-exposure-session.md`: replace three-phase model with five-state machine; close the "breathing/calming is time-scripted" gap note
- [x] 9.2 Update `docs/ddd/4-pulse-monitoring.md`: document real `PulseSpiked`/`PulseNormalized` event seam; document per-session personalized baseline replacing fixed 105 bpm

## 10. Verification

- [x] 10.1 Run `npx tsc --noEmit` — zero errors
- [ ] 10.2 Run `npx expo run:ios` on real device — verify two layers play simultaneously without dropout
- [ ] 10.3 Verify LOADING state blocks session start until all assets downloaded
- [ ] 10.4 Verify voice clip ducks trigger and trigger ramps back after clip ends
- [ ] 10.5 Simulate spike: verify trigger fades to zero in 2-3 s; verify recovery + 30 s grace before trigger resumes at pre-spike level
- [ ] 10.6 Test manual mode: distress button → fade → 90 s countdown → auto-return; re-press resets countdown
- [ ] 10.7 Test watch disconnect: simulate 8 s BLE gap → banner appears → trigger freezes → on reconnect adaptive resumes
- [ ] 10.8 Verify post-session form appears after WIND_DOWN and before After screen
- [ ] 10.9 Verify crisis-sheet pause/resume still works with the new engine
- [x] 10.10 Run `npx -y @fission-ai/openspec validate audio-engine`
