# Design

## Context

See proposal.md for motivation. Expo SDK 56 uses the installed react-native-audio-api nightly; resume and suspend return boolean promises. The session engine remains loaded underneath `/calming`. Jest uses an in-house AudioContext fake, with hooks gated individually at 95% lines and 90% branches.

## Goals / Non-Goals

**Goals:** Deterministic asynchronous ownership, usable guidance without sound, and regression coverage for failures and races.

**Non-Goals:** Inventing transcripts, asserting clinical approval for supplied recordings, changing the reviewed visual script, or claiming real native audio/device-memory verification from Jest.

## Decisions

- Each focused recording attempt owns its context, source, disposal flag and control queue. Ref updates occur in effects. Errors are applied only to their owning active attempt, preventing stale rejection from overwriting retry or locale changes.
- Serialize native controls and consult the latest pause/crisis intent before resuming and before announcing playback. Treat explicit false returns and failed activation as errors, while tolerating legacy void results. Published 0.12.2 and the current nightly both expose native boolean results; production binary inventory is unavailable. Parallel suspend/resume calls were rejected because they can settle in the wrong order.
- Detach completion before stop/close and clear the source buffer on disposal. A captured old completion callback is harmless after disposal; natural completion runs once.
- Retain the supplied files unchanged. Default to recordings with a visible visual-guidance action during loading, playback and pause; restore the existing protocol automatically on error. Reusing its reviewed content avoids inventing a transcript or trying to synchronize mismatched locale durations.
- Permit background listening, matching existing audio configuration. AppState active events recover a suspended native context, but skip activation/resume when the context reports running. Avoid reactivation failures caused solely by unlock/Control Center interactions. Disable the recording control while crisis support owns suspension and label that pause separately from manual intent.
- Audio and visual instructions are mutually exclusive. Keep the protocol orchestrator mounted to save its step, but unmount its step body while loading/playing narration so breathing and other step timers stop and instructions are hidden. Returning to visuals or an audio failure restores the saved step with its timer restarted. Narration completion shows the completion screen. Manual visual selection stops narration.
- Subscribe to the library's cross-platform interruption event for each attempt and remove that subscription on disposal. Latch a system pause on began/ended events independently of context state: iOS's shared engine can be paused while the per-context running flag stays true. Android emits the same events for permanent/transient focus loss and gain. Require explicit recovery even if `shouldResume` is true. The library documents that ended events may never arrive, so Resume remains available unless crisis support is open. User recovery clears the latch and forces the existing context through suspend/activation/resume without re-decoding or restarting the source; failures expose retry and visuals, and new interruption events re-latch the pause. Serial controls and attempt ownership also apply to interruption races.
- Manual visual mode offers Play recording to re-enable narration with a fresh attempt while preserving the visual step. Compute heading/action labels with ordered conditionals outside JSX so mode, interruption and crisis precedence are readable.
- Completion sets a local completed state and records the completion marker without navigating or invoking the page fade. Disable recording playback and unmount finished visual guidance, then show a localized completion message and Return. Only the user's Return/close action navigates to the caller. This removes dependence on whether Reanimated completion callbacks execute while backgrounded.
- Remove the unused background-music hook and its tests; the visual components and content tests remain relevant because the route uses them again.

## Risks / Trade-offs

- [Native behavior differs from fake context] → Test false return values, delayed promises, events on teardown and stale callbacks; separately retain device checks in docs/relaxation-recordings-validation.md.
- [Decoded buffers increase memory] → Release recording buffers on exit, error and visual selection; retain device profiling as an explicit outstanding measurement. No unmeasured peak-memory claim.
- [Locales differ in content/duration] → Keep visual protocol independently sourced and avoid transcript/parity assertions. Document provenance, duration/channel differences and pending content comparison.

## Migration Plan

No dependency or storage migration. Deploy with bundled recordings and existing visual protocol. Rollback can restore the visual route as primary without asset or stored-session changes.
