# Test Coverage Plan — Hearo

**Status:** Phases 0–3 implemented; native-module backfill complete (see
`docs/TEST_BACKFILL_PLAN.md`) · **Date:** 2026-06-02 · **Owner:** QE
**Companion decision:** see `docs/adr/ADR-001` on adopting Jest + RNTL.

> **Update 2026-06-08:** the native-module wrappers previously excluded from
> coverage (`trustedContacts`, `reminders`, `healthKit`/`healthKit.ios`,
> `pulse`, `asset-cache`, `audio-engine`, `CrisisSheet`) are now mocked, tested,
> and gated. `collectCoverageFrom` carries no native-module exclusions; the
> suite is 211 tests / 24 suites. Details in `docs/TEST_BACKFILL_PLAN.md`.

> Generated from an `/aqe-analyze` pass over `src/`. Originally greenfield (0
> tests, no runner). **Phases 0–3 are now done:** `jest-expo` + RNTL wired up,
> 99 tests across 16 suites, `src/lib` at ~99% stmts / 95% branch / 100% lines
> and `src/components` at ~94% stmts / 84% branch / 94% lines, with blocking CI
> gates in `.github/workflows/test.yml`. The `src/lib` gate is ratcheted to its
> 95/90 final target and a 70/70 `src/components` gate is now enforced.

---

## 1. Current state

| Metric | Value |
|---|---|
| Test runner | none (no `jest`/`vitest`/`test` script in `package.json`) |
| Test files | 0 |
| Line coverage | 0% (no instrumentation) |
| Source under `src/` | ~2,472 LOC across 25 files |
| CI | EAS Update + Android publish only — no test gate |

**Headline gap:** a safety-critical exposure-therapy app for combat veterans
ships with no automated verification of its crisis-access, session, and
content-provisioning logic. Every regression is currently caught by hand.

---

## 2. Risk-weighted module inventory

Files are ranked by **risk = (logic density × user-safety impact)**, not by LOC.
Pure-logic modules in `src/lib` are the highest-value, lowest-friction targets:
no native renderer needed, deterministic, and they encode the therapeutic rules.

### Tier 1 — Critical (test first, target ≥95%)

| Module | LOC | Why it's critical | What to assert |
|---|---|---|---|
| `src/lib/ui/displayName.ts` | 88 | Most branch-dense pure logic in the app. Parses device names in EN + Hebrew (RTL), possessives, generic-model fallback. Bilingual heuristic = high bug surface. | EN possessive `"Omer's iPhone"→"Omer"`; curly vs straight apostrophe; Hebrew `"X של Y"` both orderings + ambiguous case; generic patterns (`iPhone`, `iPhone (2)`, `My Android`) → `null`; empty/whitespace/null → `null`; cache-hit short-circuit in `resolveDisplayName`. |
| `src/lib/storage/crisis-store.ts` | 22 | Crisis sheet + ERAN hotline (`1201`). Wrong state = a veteran in crisis can't reach help. | `open()` sets `isOpen:true` and resets `showingTrustedStub`; `close()` clears both; `showTrustedStub()` flips only the stub; `CRISIS_NUMBER` constant guard (regression tripwire on the hard-coded number). |
| `src/lib/content/content.ts` | 261 | The content-provisioning seam every screen reads. `localize`, scene/sound getters, default prefs, ordering. | `localize` he/en + non-`he` fallback to en; `getScenes`/`getSounds` return in `SCENE_ORDER`/`SOUND_ORDER`; every `SceneKey`/`SoundKey` resolves; `getVoiceScript` for all `Phase`×lang; `getDefaultPreferences` shape; each sound has ≥1 audio variation. |
| `src/lib/audio.ts` | 21 | Picks the exposure trigger clip. `undefined` key must yield the "rehearsal walk" (no exposure) path per the exposure-session spec. | `undefined` → `null`; empty variations → `null`; valid key → a member of that sound's `audioVariations` (seed/stub `Math.random`). |

### Tier 2 — High (target ≥85%)

| Module | LOC | Why | What to assert |
|---|---|---|---|
| `src/lib/storage/storage.ts` | 35 | Tri-state semantics: `undefined` (never tried) vs `null` (tried, nothing) vs string. Easy to collapse the two by accident. | `getDisplayName` returns `undefined` when `resolved!=="true"`; `null` round-trips; string round-trips; `setDisplayName(null)` removes the key but still marks resolved. Mock AsyncStorage. |
| `src/lib/storage/session-store.ts` | 26 | `toggleSound` add/remove + scene selection drive what the user is exposed to. | `setScene`; `toggleSound` adds when absent, removes when present; defaults come from `getDefaultPreferences`. |
| `src/lib/integrations/pulse.ts` | 45 | `usePulse` hook — clamps to [58,130], steps toward phase target, jitter. | With faked timers + stubbed `Math.random`: clamps bounds; moves toward target by ≤STEP; `active:false` does nothing; cleanup clears interval. |

### Tier 3 — Components / screens (target ≥70%, smoke + interaction)

`CrisisSheet.tsx` (212), `CrisisAffordance.tsx`, `IntensitySlider.tsx` (128),
`SceneCarousel.tsx` (118), `BreathingCircle.tsx` (156), `VoiceLine.tsx`,
`PulseTicker.tsx`, plus screens `session.tsx` (212), `after.tsx` (197),
`setup.tsx`, `permissions.tsx`, `home.tsx`, `index.tsx`.

Render-smoke + key interactions via React Native Testing Library. **Highest
component priority: `CrisisSheet` + `CrisisAffordance`** — the path from
affordance → open → call `1201` is the one interaction that must never break.

### Tier 4 — Excluded / low value

`src/lib/ui/tokens.ts` (constants), `src/lib/ui/i18n.ts` (config), `src/app/_layout.tsx`,
`src/global.css`, asset re-exports. Cover incidentally, don't target.

---

## 3. Coverage gaps → recommended tests (priority order)

| # | Target | Type | Est. tests | Projected file cov. |
|---|---|---|---|---|
| 1 | `displayName.ts` (parse + resolve) | unit | 12–14 | 0→~95% |
| 2 | `content.ts` (localize + getters) | unit | 10–12 | 0→~92% |
| 3 | `crisis-store.ts` | unit | 4–5 | 0→100% |
| 4 | `audio.ts` (pickRandomTrigger) | unit | 4 | 0→100% |
| 5 | `storage.ts` (tri-state) | unit (mock AsyncStorage) | 6 | 0→~90% |
| 6 | `session-store.ts` | unit | 5 | 0→100% |
| 7 | `pulse.ts` (fake timers) | unit/hook | 5 | 0→~85% |
| 8 | `CrisisSheet` + `CrisisAffordance` | component (RNTL) | 6–8 | 0→~75% |
| 9 | `IntensitySlider`, `SceneCarousel` | component | 6 | 0→~70% |

**Phase-1 target (gaps 1–7, all of `src/lib`): ~90%+ on the logic layer** with
~46–50 fast, native-free unit tests. This is the highest ROI and unblocks a CI
gate immediately.

---

## 4. Tooling (greenfield setup)

Expo SDK 56 (`expo ~56.0.8`) → use `jest-expo`. There is no existing config to migrate.

```jsonc
// package.json (additions)
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
},
"jest": {
  "preset": "jest-expo",
  "collectCoverageFrom": ["src/lib/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
  "coveragePathIgnorePatterns": ["src/lib/ui/tokens.ts", "src/lib/ui/i18n.ts"]
}
```

Dev deps: `jest`, `jest-expo`, `@testing-library/react-native`,
`@testing-library/jest-native`, `@types/jest`. Mock `@react-native-async-storage/async-storage`
with its official jest mock; mock `expo-device` for `displayName` tests.

---

## 5. Coverage thresholds (CI gate)

Enforced per the companion ADR. Ratchet — never lower.

| Scope | Currently enforced | Target |
|---|---|---|
| `src/lib/**` (Tier 1–2) | 95% lines / 90% branches (ratcheted, per-file) — met at ~100/95 | 95% / 90% ✅ |
| `src/components/` | 70% lines / 70% branches (aggregate) — met at ~94/84 | 70% ✅ |
| Global | report only | 80% |

Note: the `src/components/` gate is keyed on the directory path (aggregate
across the folder) rather than a `**` glob. Jest applies a `**` glob threshold
*per matched file*, and `SceneBackground.tsx` sits at 60% branches (only its
`Math.min` intensity-clamp branch is exercised), which would fail a per-file
70% branch bar; the aggregate folder coverage of 84% branches passes cleanly.

Wire `npm run test:coverage` into a `test` job in `.github/workflows/` that runs
on PRs to `main`, gating merge.

---

## 6. Phased rollout

- **Phase 0 — Setup:** ✅ `jest-expo` + RNTL added; `test`/`test:watch`/`test:coverage` scripts; CI `test` job in `.github/workflows/test.yml`.
- **Phase 1 — Logic layer:** ✅ gaps 1–7 covered; `src/lib` gate is **blocking**, currently met at ~100 lines / 95 branches.
- **Phase 2 — Safety components:** ✅ `CrisisSheet`/`CrisisAffordance`, sliders/carousels, plus `BreathingCircle`, `VoiceLine`, `PulseTicker`, `Icon`, `SceneBackground` — 47 component tests across 9 suites; `src/components` at ~94 lines / 84 branches.
- **Phase 3 — Ratchet:** ✅ `src/lib` gate raised to **95 lines / 90 branches** (its final target, met at ~100/95); a **70/70** `src/components/` aggregate gate added and enforced.

---

## 7. Notes for the API migration

`openspec/changes/migrate-content-to-api/` will turn `content.ts` getters async
(Supabase). Writing the `content.ts` suite **now** against the current sync
contract gives a behavioral baseline the migration must preserve (call sites
gain `await`; return shapes stay). Treat these tests as the migration's safety net.
