## 1. Content adapter seam

- [x] 1.1 Create `ui/src/lib/content.ts` with types mirroring `server/openapi.yaml` (`Scene`, `Sound`, `VoiceScript`, `Preferences`)
- [x] 1.2 Implement `getScenes()`, `getScene(key)`, `getSounds()`, `getVoiceScript(scene, phase, lang)`, `getDefaultPreferences()` returning bundled local data
- [x] 1.3 Model each scene as one bundle: label{en,he} + media{still, video?} + tint + voice{opening,during,calming}{en,he}

## 2. Fix per-scene voice (the visible bug)

- [x] 2.1 Author scene-specific voice scripts for all four scenes (river, park, cafe, road) in EN + HE, inside the content bundle
- [x] 2.2 Update `session.tsx` to pull the voice script from the active scene via `content.ts`, not from generic `i18n session.voice.*`
- [x] 2.3 Remove the now-dead generic `session.voice.*` keys from `i18n.ts`
- [x] 2.4 Verify: choosing Park plays park words; choosing River plays river words (deterministic — voice is keyed by scene in content.ts)

## 3. Scene media

- [ ] 3.1 Integrate `expo-video` for the active session background (muted, looping) — DEFERRED: no video assets yet, and installing a player with nothing to play has no demo benefit. Seam supports it (Scene.media.video optional).
- [~] 3.2 `SceneBackground.tsx` consumes `content.ts`; renders video when present, falls back to still otherwise, keeps the dark overlay — consume + still-fallback + overlay DONE; video-render path deferred with 3.1.
- [ ] 3.3 Setup picker uses each scene's still (no video on the picker) — DEFERRED: picker is still a radio list; turning options into image cards is a visual rework that wants real still assets to look right.
- [ ] 3.4 Wire `require()` references for bundled assets in `ui/assets/scenes/` — DEFERRED: no assets yet; using marked placeholder URIs + scene-tint fallback.

## 4. Move remaining content behind the seam

- [x] 4.1 `session-store.ts` default scene/sounds come from `content.getDefaultPreferences()`
- [x] 4.2 Sounds list (Setup) and sound labels come from `content.getSounds()`

## 5. TODO(api) markers for what stays hard-coded

- [x] 5.1 Mark `home.greeting` user name → `TODO(api): GET /users/me — displayName`
- [x] 5.2 Mark `session.tsx` SCRIPT timeline → `TODO(api): session program config`
- [x] 5.3 Mark `pulse.ts` TARGETS + thresholds → `TODO(api): /preferences — personalized pulse thresholds`
- [x] 5.4 Mark `after.tsx` SPARK array → `TODO(api): from the POST /sessions record`
- [x] 5.5 Mark `content.ts` adapter functions → `TODO(api): <endpoint>` each (the swap points)
- [x] 5.6 Document `CRISIS_NUMBER` as intentionally hard-coded region config

## 6. Verification

- [x] 6.1 `grep -rn "TODO(api)" ui/src` lists every marked site, each naming an endpoint
- [x] 6.2 `npx tsc --noEmit` clean
- [x] 6.3 `npx expo export --platform web` bundles
- [ ] 6.4 Manual: each scene shows matching imagery + matching voice on device
- [x] 6.5 `npx -y @fission-ai/openspec validate migrate-content-to-api` passes
