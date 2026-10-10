# Relaxation recording validation

## Provenance and format

The user supplied `relax_english.mpeg` and `relax_hebrew.mpeg` from Downloads. The bundled `assets/sounds/calming/relax-en.mp3` and `relax-he.mp3` are byte-identical copies, renamed to match their actual MP3 format. Neither recording was edited or transcribed.

| Asset | Codec | Rate | Channels | Encoded duration | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| relax-en.mp3 | MPEG Layer III | 44,100 Hz | Mono | 62.1975 s | 28712293153D7AA676BE942CD930E6ADB1D5988B29EC21BE42F3EBF42E4DFAC3 |
| relax-he.mp3 | MPEG Layer III | 44,100 Hz | Stereo | 109.810181 s | 6DFB8430EBA0FB18C55D3847FB8A7EE9455D7150685388BA6E9CFC29A085372F |

Both files fully decoded without error using `ffmpeg -v error -xerror -i <asset> -f null -`. The locked react-native-audio-api `0.13.0-nightly-1a9dfbd-20260618` package supports MP3 via its shared miniaudio decoder and resolves bundled module IDs on both mobile platforms. These checks establish format compatibility, not audible playback in this app.

## Guidance availability

Recordings are the default requested by the user. This is not evidence of clinical approval or content equivalence. No existing approval record or verified transcript establishes that either file matches Dr. Hirschman's five-step script or the other locale. No transcription runtime is installed in this workspace.

The existing reviewed visual protocol (`getCalmingProtocol`, with [source reference](voice-scripts/calming.md)) is available during loading, playback and pause, and appears automatically on audio failure. It is independent guidance, not a synchronized transcript. Choosing it stops audio and releases the recording buffer. Retrying or choosing Play recording retains the visual step but hides visual instructions and unmounts their timers during narration loading/playback. Failure or choosing visuals again restores the saved step with its timer restarted. The two forms of guidance never run together; narration completion shows the completion screen. Recording and visual guidance have distinct localized headings. Content review must still compare both recordings with the reference, including breathing phase timing and the closing message.

## Automated regression checks

The recording hook is tested against the existing fake AudioContext for suspended startup, pause/crisis ownership, activation failure, false native results, foreground activation checks, serialized control races, locale/retry ownership, cancellation during activation/suspend/decode, completion and teardown events. Screen tests exercise the real hook with that fake and verify manual/automatic visual guidance, retry, Hebrew fallback, completion and exit. Automatic completion never navigates or schedules a page fade, even when backgrounded; foregrounding remains on the completion screen. Only an explicit Return/close action allows the underlying practice session to regain focus and resume. This safety behavior does not depend on native Reanimated background scheduling.

The fake's suspend/resume methods return true, matching the installed library's boolean contract. Explicit false is tested as an error; void return compatibility is also tested. The published `react-native-audio-api-0.12.2.tgz` package was inspected: `src/core/AudioContext.ts` declares `Promise<boolean>` and `common/cpp/audioapi/HostObjects/AudioContextHostObject.cpp` resolves resume/suspend with `jsi::Value(result)`. Thus the suspected void-return incompatibility is not present in the cited 0.12.2 release. This workspace has no production binary inventory, so exact versions in deployed SDK 56 binaries remain unverified; no OTA runtime policy was changed.

Without a reported interruption, foreground events skip activation/resume if the native context reports running. A reported interruption overrides that shortcut: per-attempt listeners latch a system pause on both began and ended events, show an interruption prompt, and require explicit Resume. The library documents that ended events may never arrive, so the user can probe recovery without one. This applies even when `shouldResume` is true or context state misleadingly remains running. Explicit recovery suspends, reactivates and resumes the existing context/source, preserving narration position. Failure exposes retry and visual guidance, and a new interruption event latches the pause again. Crisis support still disables the recording control and preserves manual pause intent. Manual visual mode offers Play recording without losing the visual step.

Native source inspection confirms the distinction: `ios/audioapi/ios/system/AudioEngine.mm` leaves the shared engine paused when `onInterruptionEnd(false)` runs, while the per-context state may remain running. Android `AudioFocusListener.kt` emits interruption began on permanent/transient loss, and ended on gain (`shouldResume` reflects transient loss). Event handling is therefore shared across platforms. Automated tests reproduce these event/state combinations; actual hardware playback and activation failure rates remain unmeasured.

Validation run after missing-event and coherent-guidance corrections: `npm run test:coverage -- --ci` passed all 46 suites / 526 tests. Regressions cover explicit recovery without an ended event, recovery failure fallback, existing interruption/control races, exclusive narration/visual modes, saved visual steps and stopped hidden timers. The hook has 100% line coverage and 97.5% branch coverage; thresholds and exclusions were not weakened. `npx tsc --noEmit`, changed-file lint and strict OpenSpec validation passed. Existing i18next default-member warnings remain outside the changed files.

## Memory estimates and outstanding device checks

At 44.1 kHz, float PCM alone is approximately 10.5 MiB for English and 36.9 MiB for Hebrew (`duration × sample rate × channels × 4`). With a device-preferred 48 kHz context, the corresponding figures are approximately 11.4 and 40.2 MiB. These are steady buffer estimates, not measured peak usage: decoding accumulates interleaved samples and then creates the deinterleaved output, and the suspended practice engine still owns its buffers. The duration/channel mismatch remains explicit; it does not prove content mismatch or equivalence.

Disposal detaches completion, stops the source, clears its buffer and closes its context on failure, exit, visual selection, blur, retry or locale replacement. A cancelled decode cannot attach its result to a new attempt. No real-device peak-memory measurement was possible in this Windows workspace; no Android device tooling is available here and iOS native execution requires a Mac/device runner.

Follow-up validation on a native build:

1. On real iOS and the lowest supported Android device, enter a break from the longest practice session, play each locale through completion, pause/resume, open/close crisis support, lock/unlock the screen, open Control Center and exercise phone-call/Siri interruptions and Android permanent/transient focus loss. Log interruption type/shouldResume/context state and missing ended events; verify the interruption prompt and audible explicit recovery at the same recording position, or fallback if activation is still unavailable. Measure missing-event frequency; no frequency claim is established here. Verify completion/unlock keeps exposure audio paused and only an explicit Return/close resumes the session.
2. Set hardware volume to zero and select visual guidance. Simulate activation/decode/resume failures in a development build; verify automatic visual guidance and retry without unexpected exposure-session return.
3. Capture baseline process memory with the session loaded, peak during each recording decode, steady playback, and recovery after exit/error/visual selection/repeated locale switching. On Android use `adb shell dumpsys meminfo com.techheal.hearo` together with a profiler; on iOS use Instruments Allocations/VM Tracker. Record device/OS/build and observed peak values before claiming low-end memory suitability.
4. Have the content owner compare English and Hebrew recordings with the reviewed source and record any script/timing differences and their disposition. Until then, retain independent visual guidance and do not label the recordings as equivalent approved scripts.
