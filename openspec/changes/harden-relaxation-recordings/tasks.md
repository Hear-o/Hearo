# Tasks

## 1. Recording lifecycle

- [x] 1.1 Isolate attempts, serialize controls, check activation/native boolean results and detach completion on disposal; verify loading, pause/crisis, races, failures, retry, language switching and cancellation with the existing AudioContext fake.
- [x] 1.2 Support background listening with foreground activation rechecks; verify AppState behavior in hook tests and document native validation limits.

## 2. Always-available visual guidance

- [x] 2.1 Restore reviewed visual protocol as a manual option and automatic failure fallback, stopping narration on selection/exit; verify the route's failure, manual selection, completion and retry behavior with regression tests.
- [x] 2.2 Remove the unused music-only overlay and reconcile stale spec/voice-script references; verify no remaining imports and document locale content/memory checks.

## 3. Integration checks

- [x] 3.1 Run TypeScript, changed-file lint, strict OpenSpec validation and the CI Jest coverage command; verify the hook passes 95% lines / 90% branches without coverage exclusions.

## 4. Explicit return after completion

- [x] 4.1 Keep recording and visual completion on the calming route with localized completion text and explicit return; verify that background completion and foregrounding never schedule navigation or restart audio, and that Return still navigates.
- [x] 4.2 Reconcile the behavior contract and documentation, then run screen regressions, TypeScript, lint, strict OpenSpec validation and the CI coverage gate.

## 5. Foreground recovery and persistent fallback

- [x] 5.1 Skip activation/resume for a running context, retain suspended-context recovery and tolerate void results while rejecting false; verify race/regression tests and inspect published 0.12.2 contracts.
- [x] 5.2 Preserve visual progress throughout retries and audio completion, disable support-owned pause controls, and distinguish both localized mode headings; verify screen regressions.
- [x] 5.3 Update behavior/design/validation docs and pass TypeScript, lint, strict OpenSpec validation and the CI coverage gate.

## 6. Native interruptions and reversible mode selection

- [x] 6.1 Subscribe to interruption events, latch system pause independently of context state and offer explicit recovery preserving source position; verify shouldResume=false/true, misleading running state, decode/control races, cleanup and crisis interaction with regression tests.
- [x] 6.2 Offer Play recording from visual mode with visual-step preservation and replace nested label ternaries with ordered mappings; verify route regressions and changed-file lint.
- [x] 6.3 Reconcile specs/design/native validation limits and pass TypeScript, strict OpenSpec validation and the CI coverage gate.

## 7. Missing interruption events and coherent guidance

- [x] 7.1 Allow explicit recovery without ended, preserve position and show fallback on failure; add hook and screen regressions.
- [x] 7.2 Hide visual instructions and stop step timers while narration is selected, preserving the saved step for visual return; add timer and mode regressions.
- [x] 7.3 Reconcile documentation and pass TypeScript, changed-file lint, strict OpenSpec validation and CI coverage.

## Workflow follow-up

- Validate native playback, interruptions and memory on real iOS and the lowest supported Android device as described in docs/relaxation-recordings-validation.md.
- Compare both recordings with the reviewed script and obtain content review; no transcript or clinical-parity assertion is made by this change.
