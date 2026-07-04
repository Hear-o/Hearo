## 1. Storage seam

- [x] 1.1 Add `psychoEducationSeen` key + `getPsychoEducationSeen()` / `setPsychoEducationSeen()` getters to `src/lib/storage/storage.ts`. Two-state (boolean), defaults to `false`.
- [x] 1.2 Unit-test the round-trip + default in `src/lib/storage/__tests__/storage.test.ts`.

## 2. Content

- [x] 2.1 In `src/lib/content/content.ts`, add `PsychoEducationContent` type (`{ heading: LocalizedText; body: LocalizedText[]; continueLabel: LocalizedText }`) and a `getPsychoEducation()` getter. Body is an array so we can render one paragraph per Text block.
- [x] 2.2 Author content — EN translation of the Hirschman Hebrew source (`docs/research/psychoeducation-hirschman.md`, to be added in §5). Five paragraphs, second-person prose.
- [x] 2.3 Unit-test the getter — both languages resolve, body has ≥4 paragraphs.

## 3. Screen

- [x] 3.1 Create `src/app/psychoed.tsx`. Layout: heading + body paragraphs + a single Continue pressable. Same visual language as Permissions (uppercase tracked label, display-serif heading, body prose, single primary action).
- [x] 3.2 On Continue press: `setPsychoEducationSeen(true)` then `router.replace({ pathname: "/session", params: { scene } })` — `replace`, not `push`, so the back-stack doesn't include `/psychoed` (no re-entering it from the session).
- [x] 3.3 Crisis affordance (`<CrisisAffordance />`) in the top-left, same as every other screen.
- [x] 3.4 RTL respected (Hebrew flows right-to-left automatically via I18nManager).

## 4. Flow

- [x] 4.1 In `src/app/home.tsx`, change the Begin pressable's handler: read `psychoEducationSeen`; if `false`, route to `/psychoed` with the scene param; if `true`, route to `/session` directly.
- [x] 4.2 Add a "Re-read intro" link on the Setup screen (`src/app/setup.tsx`) that routes to `/psychoed` regardless of the flag — but does NOT auto-flip the flag back to false on view. Push-route, not replace, so the user can back out.

## 5. Research doc

- [x] 5.1 Add `docs/research/psychoeducation-hirschman.md` with the Hebrew source paragraph from the 2026-06-09 meeting (`/tmp/hearo-docs/psychoed.docx` extract) and the EN translation, side-by-side, with attribution: "Source: Dr. Michal Hirschman, 2026-06-09."

## 6. Verification

- [x] 6.1 `npx tsc --noEmit` clean
- [x] 6.2 `npx jest` — all suites pass, no coverage regressions
- [x] 6.3 `npx -y @fission-ai/openspec validate add-psycho-education` passes
