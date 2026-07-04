## 1. State and i18n

- [x] 1.1 Add `ui/src/lib/crisis-store.ts` with Zustand store exposing `{ isOpen, open(), close() }`
- [x] 1.2 Verify and extend `crisis.*` keys in `ui/src/lib/i18n.ts` for both EN and HE (headline, callPrimary, trustedSecondary, trustedStubMessage, close)
- [x] 1.3 Add `CRISIS_NUMBER` constant (`"1201"`) somewhere shared — likely `ui/src/lib/tokens.ts` or a new `ui/src/lib/crisis.ts`

## 2. CrisisAffordance component

- [x] 2.1 Create `ui/src/components/CrisisAffordance.tsx` rendering the `i` glyph with proper styling (Heebo body font, muted color, hitSlop)
- [x] 2.2 Wire `onPress` to call `useCrisisStore.open()`
- [x] 2.3 Add a `tone` prop (`"on-bg" | "on-scene"`) so it can use slightly different opacity/color on dark flat backgrounds vs over scene imagery

## 3. CrisisSheet component

- [x] 3.1 Create `ui/src/components/CrisisSheet.tsx` — Reanimated-driven bottom sheet
- [x] 3.2 Read `isOpen` from `useCrisisStore` and animate slide-up (600ms `Easing.out(Easing.cubic)`) on open / slide-down on close
- [x] 3.3 Render headline using display serif (Frank Ruhl Libre) — bilingual via i18n
- [x] 3.4 Primary action: large tappable area, accent color, calls `Linking.openURL("tel:" + CRISIS_NUMBER)`
- [x] 3.5 Secondary action: `a person you trust` — when tapped, swaps the action area for the trusted-stub message (no navigation)
- [x] 3.6 Close link at the bottom — text link, muted, calls `useCrisisStore.close()`
- [x] 3.7 Backdrop layer (semi-opaque) above all screens but below the sheet itself; tapping it also closes the sheet

## 4. Mount sheet at root layout

- [x] 4.1 Import and render `<CrisisSheet />` inside `ui/src/app/_layout.tsx` outside the `<Stack />` so it sits above all routes
- [x] 4.2 Confirm z-index works on both iOS and web (test in browser via `npx expo start --web`)

## 5. Place affordance on every screen

- [x] 5.1 Add `<CrisisAffordance />` to `ui/src/app/index.tsx` (Welcome) — top-left of the existing top margin area
- [x] 5.2 Add `<CrisisAffordance />` to `ui/src/app/permissions.tsx`
- [x] 5.3 Add `<CrisisAffordance />` to `ui/src/app/setup.tsx`
- [x] 5.4 Replace the placeholder `i` text in `ui/src/app/home.tsx` with `<CrisisAffordance />`
- [x] 5.5 Replace the placeholder `i` text in `ui/src/app/session.tsx` with `<CrisisAffordance tone="on-scene" />`
- [x] 5.6 Add `<CrisisAffordance />` to `ui/src/app/after.tsx`

## 6. Session pause/resume integration

- [x] 6.1 In `ui/src/app/session.tsx`, subscribe to `useCrisisStore.isOpen`
- [x] 6.2 When `isOpen` flips true, freeze the script timer (capture remaining time), set audio target volume to 0 with a 200ms fade
- [x] 6.3 When `isOpen` flips false, resume the script timer from where it paused and ramp audio back to its pre-pause level over 600ms
- [x] 6.4 Ensure the breathing circle freezes mid-animation by stopping its `withRepeat` and saving the current scale, then resuming on close

## 7. RTL / Hebrew

- [x] 7.1 Verify all crisis copy renders correctly in Hebrew with RTL layout (simulator with Hebrew locale)
- [x] 7.2 Confirm the close link sits at the bottom-right margin under RTL (NativeWind `rtl:` variants where needed)
- [x] 7.3 Confirm the affordance stays at the leading edge (which becomes top-right under RTL)

## 8. Verification

- [x] 8.1 Run `npx tsc --noEmit` from `ui/` — no errors
- [x] 8.2 Run `npx expo export --platform web --output-dir /tmp/hearo-crisis-verify` — bundle succeeds
- [ ] 8.3 Manually walk through each screen, tap the `i` glyph, verify sheet opens
- [ ] 8.4 On Session screen: start a session, tap `i` mid-session, verify audio fades and breathing freezes; dismiss, verify both resume from paused state
- [ ] 8.5 Tap `call ERAN 1201` on a real iOS device — verify the dialer opens with 1201 prefilled
- [ ] 8.6 Tap `a person you trust` — verify the stub message appears
- [ ] 8.7 With airplane mode on, verify the sheet still opens and the tel link still launches the dialer

## 9. Validate against OpenSpec

- [x] 9.1 Run `npx -y @fission-ai/openspec validate add-crisis-sheet` — passes
- [ ] 9.2 Mark all tasks complete in this file before running `/opsx:archive`
