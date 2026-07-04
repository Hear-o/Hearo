# Test Backfill Plan — Coverage-Excluded Files

**Status:** ✅ Implemented (2026-06-08) · **Owner:** QE
**Companion docs:** `docs/TEST_COVERAGE_PLAN.md` (the main strategy), `docs/adr/ADR-001` (Jest + RNTL adoption).

> Goal: retire every `!`-exclusion in `jest.config.js → collectCoverageFrom` so
> the eight currently-uncovered modules are instrumented and held to the same
> CI gates as the rest of `src/`. Each exclusion exists only because the file
> imports a native SDK that has no Jest mock yet — this plan builds those mocks
> and the tests behind them, in ROI order, so unrelated PRs are never blocked.

## ✅ Outcome

All eight files are now instrumented and gated; **no native-module exclusions
remain** in `collectCoverageFrom`. Test count rose **121 → 211** (24 suites).
Final per-file coverage (lines / branches):

| File | Lines | Branches | Notes |
|---|---:|---:|---|
| `healthKit.ts` | 100% | 100% | required `require("@/lib/integrations/healthKit.ts")` — jest-expo's default platform is iOS, so a bare import resolves `.ios.ts` |
| `trustedContacts.ts` | 100% | 100% | |
| `reminders.ts` | 100% | 100% | |
| `pulse.ts` | 100% | 100% | real-HR-source branches added to the existing suite |
| `asset-cache.ts` | 100% | 100% | |
| `audio-engine.ts` | 100% | 94.6% | |
| `healthKit.ios.ts` | 100% | 95.8% | two provably-dead defensive branches marked `istanbul ignore` (see note ⚠️) |
| `CrisisSheet.tsx` | 93.8% | 80% | picker flow added; comfortably clears the components 70/70 aggregate |

New SDK mocks live in `test/mocks/`: `expo-contacts`, `expo-notifications`,
`expo-file-system-legacy`, `react-native-healthkit`, `react-native-audio-api`.

⚠️ **Plan correction (§5 escape hatch):** a per-file `coverageThreshold` key
does **not** reliably override a `**` glob threshold in this Jest version — the
glob's 90% still applied to `healthKit.ios.ts`. The working approach for that
file's genuinely-unreachable branches is `/* istanbul ignore */` markers at the
source (documented inline), keeping the uniform `src/lib/**` 95/90 gate intact.

Two gotchas worth remembering for future backfills: (1) `expect(fn).toThrow(/re/)`
can throw a spurious `RangeError` under istanbul instrumentation — use try/catch
or a string/class matcher; (2) modules with module-level state (e.g.
`healthKit.ios.ts`'s init flags) need `jest.resetModules()` + re-require per test.

---

## 1. Why these files are excluded today

`jest.config.js` drops eight paths from `collectCoverageFrom`. They split into
three reasons, all the same root cause — **an unmocked native module**:

| # | File | LOC | Native dependency | Existing test? |
|---|---|---:|---|---|
| 1 | `src/lib/integrations/healthKit.ts` | 38 | **none** (web/Android fallback stub) | no |
| 2 | `src/lib/integrations/trustedContacts.ts` | 108 | `expo-contacts` | no (mock proven in `CrisisSheet.test.tsx`) |
| 3 | `src/lib/integrations/reminders.ts` | 85 | `expo-notifications` | no |
| 4 | `src/lib/integrations/pulse.ts` | 97 | `./healthKit` (real-HR branch only) | **yes — mock path only** |
| 5 | `src/lib/audio/asset-cache.ts` | 159 | `expo-file-system/legacy` | no |
| 6 | `src/lib/integrations/healthKit.ios.ts` | 143 | `@kingstinct/react-native-healthkit` | no |
| 7 | `src/lib/audio/audio-engine.ts` | 375 | `react-native-audio-api` | no |
| 8 | `src/components/CrisisSheet.tsx` | 419 | `expo-contacts` (transitive, picker only) | **yes — main view + call path only** |

Two important nuances the inventory above encodes:

- **`healthKit.ts` imports nothing native.** It's a hardcoded "not available"
  stub, grouped with the HealthKit family only by name. It needs **zero mocks**
  and is a free win — include it first.
- **`pulse.ts` and `CrisisSheet.tsx` already have passing tests** but are
  excluded because those tests don't touch the native-dependent branches
  (`pulse`'s real-HR path, `CrisisSheet`'s contact picker). Un-excluding them
  *as-is* would instrument the uncovered branches and **fail CI immediately**.
  They must get their missing-branch tests *before* the exclusion is removed.

---

## 2. Gate mechanics (read before un-excluding anything)

`coverageThreshold` in `jest.config.js`:

- **`./src/lib/**/*.{ts,tsx}` → 95 lines / 90 branches, applied _per file_.**
  The moment a lib file is un-excluded it is held to 95/90 on its own. There is
  no aggregate cushion. ⇒ ship the test first, the config change second, in the
  same PR.
- **`./src/components/` → 70 lines / 70 branches, _aggregate_ across the folder.**
  Un-excluding `CrisisSheet.tsx` (419 LOC) injects a large block into the
  denominator; if its own coverage is low it drags the whole folder under 70.
  ⇒ get CrisisSheet itself comfortably above 70 before un-excluding.
- **ADR-001 ratchet rule: never lower a gate.** For the two genuinely hard
  files (`audio-engine.ts`, `healthKit.ios.ts`) where 95/90 may be impractical,
  the sanctioned escape hatch is a **dedicated, more-specific per-file
  threshold key** (see §5) — not lowering the `src/lib/**` glob.

---

## 3. Mock infrastructure (the real cost driver)

The work is ~80% mock-building, ~20% assertions. No SDK mock exists yet (only
the inline `expo-contacts` mock in `CrisisSheet.test.tsx` and the
`jest.mock("@/lib/storage")` pattern in `displayName.test.ts`).

**Recommendation: shared mock factories in `test/mocks/`, applied per-suite via
`jest.mock(..., factory)`.** Explicit and greppable; avoids a root `__mocks__/`
auto-mock silently changing the existing `CrisisSheet.test.tsx` behavior. Reserve
`test/setup.ts` (global) for modules every suite needs — do **not** add these
there, since the logic suites must stay native-free and fast.

| Module to mock | Surface the code touches | Gotcha |
|---|---|---|
| `expo-contacts` | `getPermissionsAsync`, `requestPermissionsAsync`, `getContactByIdAsync`, `getContactsAsync`, `Fields`, `SortTypes` | ES-class native module → **must** be manually mocked (`"Super expression must…"` if not). Shape already proven in `CrisisSheet.test.tsx:8`. |
| `expo-notifications` | `setNotificationHandler`, `get/requestPermissionsAsync`, `schedule/cancelScheduledNotificationAsync`, `SchedulableTriggerInputTypes.DAILY` | `PermissionStatus` is a *type* (erased) — mock only needs the runtime fns + the `SchedulableTriggerInputTypes` enum. |
| `@kingstinct/react-native-healthkit` | `isHealthDataAvailable`, `requestAuthorization`, `queryQuantitySamples` | Promise-style. Mock the named exports used by the adapter and keep the mock object stable across `jest.resetModules()`. |
| `expo-file-system/legacy` | `cacheDirectory`, `getInfoAsync`, `makeDirectoryAsync`, `readAsStringAsync`, `writeAsStringAsync`, `downloadAsync`, `deleteAsync` | Mock the **`/legacy` subpath** exactly. `cacheDirectory` is read at module load → provide a string. |
| `react-native-audio-api` | `AudioContext` (→ `createGain`, `createBufferSource`, `decodeAudioData`, `suspend`/`resume`/`close`, `currentTime`, `state`, `destination`); `GainNode.gain` (→ `value`, `cancelScheduledValues`, `cancelAndHoldAtTime`, `setValueAtTime`, `linearRampToValueAtTime`) | Largest mock. Gain nodes need a `value` that survives ramp calls so assertions can read it. |
| `@/lib/healthKit` | `isAvailable`, `subscribeHeartRate` | For `pulse.ts` only — mock the app-owned adapter, not the vendor package, to drive the real-HR branch. |

---

## 4. Phased rollout (ROI order, grouped by shared mock)

Each phase is independently shippable and leaves CI green. Order favors
quick wins and amortizes each new mock across the files that share it.

### Phase 4 — Quick wins (no new SDK mock or trivial mock)
Establishes `test/mocks/` and clears 4 of 8 files fast.

| File | Mock | Key assertions | Est. tests |
|---|---|---|---:|
| `healthKit.ts` | none | `isAvailable→false`, `requestAuthorization→"denied"`, `getAuthorizationStatus→"undetermined"`, `subscribeHeartRate` returns a callable no-op | 4 |
| `reminders.ts` | `expo-notifications` | `setSchedule` persists + cancels-then-schedules with DAILY trigger & correct hour/minute; `clearSchedule` clears storage + cancels; `reassertSchedule` no-ops when unset and re-registers when set; handler shape | 7–8 |
| `trustedContacts.ts` | `expo-contacts` | `addTrustedContact` dedupe / `full` cap at `MAX_CONTACTS` / most-recent-first ordering; `removeTrustedContact`; `firstPhone` mobile-preference + whitespace strip + no-phone null; `resolveContact` null on miss/throw; `resolveTrustedContacts` skips unresolved; `listAllContacts` filters + swallows errors → `[]` | 12–14 |
| `pulse.ts` | `@/lib/healthKit` | **Add to existing suite:** `source→"real"` when `isAvailable`; real samples set `value`; silence ≥ `REAL_SILENCE_MS` downgrades to `"mock"`; unsubscribe called on unmount | +4–5 |

→ Un-exclude these 4 lib paths once each suite clears 95/90.

### Phase 5 — File-system + audio integration
| File | Mock | Key assertions | Est. tests |
|---|---|---|---:|
| `asset-cache.ts` | `expo-file-system/legacy` | cache-hit (hash match → no download); stale/missing → download + sidecar write; non-200 → delete partial + throw; sidecar-write failure → delete asset + rethrow; `onProgress` counts; `ensureCacheDir` creates only when absent; `clearAudioCache` deletes only when present | 9–11 |
| `audio-engine.ts` | `react-native-audio-api` + fake timers | constructor wires gains (ambient 1.0, trigger silence); `startAmbient` throws unloaded / idempotent; scheduler fire→burst→end→reschedule under `advanceTimersByTime`; `onSpike`/`onNormalized` pause + 30 s grace resume; `playVoiceClip` interrupt + `onEnded`; `pause/resumeAll`; `fadeOutAll`; `destroy` clears all timers; `freezeGain` `cancelAndHoldAtTime`-present vs fallback branch | 18–24 |

### Phase 6 — HealthKit iOS + CrisisSheet picker (hardest)
| File | Mock | Key assertions | Est. tests |
|---|---|---|---:|
| `healthKit.ios.ts` | `@kingstinct/react-native-healthkit` + fake timers + `jest.setSystemTime` | `ensureInit` dedupes concurrent callers + persists granted; `isAvailable` false-fast vs authorization; `getAuthorizationStatus` sticky-flag path; `subscribeHeartRate` polls at `POLL_MS`, dedupes by `endDate`, rounds bpm, cancels cleanly | 10–12 |
| `CrisisSheet.tsx` | `expo-contacts` (reuse Phase-4 factory) | **Add to existing suite:** `onAddSomeone` permission-request flow; picker renders candidates (already-trusted filtered out); `onPickContact` adds + returns to main; cap defense at `MAX_CONTACTS`; denied-permission explanation copy | +6–8 |

→ Import `healthKit.ios.ts` **directly** (`../healthKit.ios`) rather than
relying on platform resolution, so the test is deterministic regardless of the
Jest default platform. Un-exclude `CrisisSheet.tsx` only after the picker tests
land and the `src/components/` aggregate is verified ≥70.

---

## 5. Target `jest.config.js` end state

Delete all eight `!` lines from `collectCoverageFrom`. If Phase 6 shows 95/90 is
uneconomical for the two timer-dense files, add **specific per-file keys**
(more-specific path wins over the `**` glob for that file — the gate is still
enforced, just at a documented, ratchet-able level) instead of weakening the glob:

```js
coverageThreshold: {
  "./src/lib/**/*.{ts,tsx}": { lines: 95, branches: 90 },
  // Escape hatch ONLY if Phase 6 proves 95/90 impractical for timer/automation-
  // dense wrappers. Start as high as the suite reaches; ratchet up over time.
  // "./src/lib/audio/audio-engine.ts": { lines: 88, branches: 80 },
  // "./src/lib/integrations/healthKit.ios.ts": { lines: 88, branches: 80 },
  "./src/components/": { lines: 70, branches: 70 },
},
```

Update `docs/TEST_COVERAGE_PLAN.md` §5 and the `jest.config.js` TODO comment
block as each file graduates, so the doc and config never drift.

---

## 6. Effort & sequencing summary

| Phase | Files | New mocks | Est. tests | Risk retired |
|---|---|---|---:|---|
| 4 | healthKit.ts, reminders.ts, trustedContacts.ts, pulse.ts | contacts, notifications | ~27–31 | Crisis contact data layer; reminder scheduling; real-HR fallback logic |
| 5 | asset-cache.ts, audio-engine.ts | file-system, audio-api | ~27–35 | "No streaming mid-session" guarantee; full session audio graph |
| 6 | healthKit.ios.ts, CrisisSheet.tsx | health (+ reuse contacts) | ~16–20 | Apple Watch HR ingestion; crisis picker flow |

**Recommended first PR:** Phase 4's `healthKit.ts` + `trustedContacts.ts` —
zero/one mock, highest safety-per-effort (trusted contacts is the crisis
sheet's data layer), and it stands up the `test/mocks/` scaffolding everything
else reuses.

---

## 7. Out of scope (noticed, not part of this plan)

`src/components/features/post-session/index.ts` is a barrel that is **already
included** in coverage and reports 0% (re-export only, never imported by a
test). It doesn't move the `src/components/` aggregate meaningfully, but it's a
free fix — either add it to `collectCoverageFrom` ignores or have a test import
through the barrel. Track separately from the native-mock backfill.
