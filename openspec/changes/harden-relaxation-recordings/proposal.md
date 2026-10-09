# Proposal

## Why

Replacing the calming screen with recordings removed the reviewed text and visual protocol and introduced untested asynchronous playback. Audio failure or inaudible playback must not leave a user without guidance, and the new hook must pass the existing per-file coverage gate.

## What Changes

- Play the supplied English or Hebrew recording by default, with pause, resume and retry controls.
- Make the existing reviewed five-step visual protocol available at any time; show it automatically on playback failure.
- Keep the session paused underneath; after automatic completion, wait for an explicit user return. Stop narration before leaving or switching to visuals.
- Isolate playback attempts, serialize controls, handle explicit false native return values, tolerate legacy void results, and support background listening with foreground recovery only when the native context is suspended.
- Add lifecycle and screen regression tests without changing coverage thresholds; remove the unused music-only overlay.
- Record content parity and native memory/playback checks as unresolved device/content validation, rather than implying clinical approval or transcript equivalence.

## Capabilities

### New Capabilities

- `calming-protocol`: Durable contract for the calming route, combining localized recordings with always-available reviewed visual guidance. This formalizes the current pause-and-return behavior and supersedes the unarchived `add-calming-protocol` change's older end-session navigation requirements.

### Modified Capabilities

None. Session engine and crisis sheet requirements remain owned by their existing specs.

## Impact

The calming route, recording hook, English/Hebrew labels, audio mock and regression suites. No additional runtime dependency or asset conversion. The reviewed content and its breathing/grounding components remain reachable in production. Native playback and peak device memory remain outside what the fake AudioContext proves.
