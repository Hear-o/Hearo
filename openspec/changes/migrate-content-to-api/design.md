## Context

Content is scattered across three files with no single owner per scene, which produced the river-voice-on-every-scene bug. The app's data layer is **Supabase** — no service layer in between. The job here is to create one client-side adapter that local data feeds today and Supabase queries will feed tomorrow, fix the per-scene coherence now, and leave a greppable `TODO(supabase)` trail at every hard-coded site naming the table or query that will replace it.

Constraints: Expo SDK 56 with a native dev build (no sandboxed runner), offline-capable, bilingual.

## Goals / Non-Goals

**Goals:**

- One typed module (`content.ts`) that owns all content access, shaped like the API responses.
- A scene is one coherent bundle; picking Park yields park imagery + park voice.
- Every hard-coded data site marked `TODO(supabase): <table or query>` and greppable.
- Looping video on the active session; still image on the Setup picker.

**Non-Goals:**

- Wiring the Supabase client or any actual queries. The schema doesn't exist yet; this change only prepares the seam.
- Producing the actual media files (team asset work) — only the integration and the `require()` wiring.
- Personalizing pulse thresholds or session length (separate future change).
- Removing the mock pulse generator (it stays until HealthKit lands).

## Decisions

### One adapter module, shaped like the API

`content.ts` exports functions in a stable shape — `getScenes()`, `getSounds()`, `getVoiceScript(scene, phase, lang)`, `getDefaultPreferences()`. Today they read bundled local data; later their bodies become `supabase.from(...).select(...)` calls and the return types become `await`-able. The shape will line up with the auto-generated Supabase types (`database.types.ts`) when the schema lands.

**Alternative considered:** a React context/provider. Rejected for now — the data is static at the local stage, so plain functions are simpler. The provider can wrap `content.ts` later when data becomes async without changing call sites (the functions can return promises then).

### A scene is a bundle

```ts
type Scene = {
  key: SceneKey;
  label: { en: string; he: string };
  media: { still: ImageSource; video?: VideoSource };
  tint: { top: string };
  voice: Record<Phase, { en: string; he: string }>;
};
```

This is the fix for the mismatch: the voice script lives *inside* the scene, so it can't drift from the label. The generic `session.voice.*` i18n keys go away; voice text comes from the active scene.

### Video on session, still on picker

`expo-video` for the active session background — one muted, looping clip under the existing dark overlay. The Setup picker uses the `still` for each scene (four simultaneous videos would be wasteful and janky). Motion is kept slow and ambient; busy footage is activating.

**Alternative considered:** video thumbnails on the picker cards. Rejected for performance and because stills read fine at card size.

### TODO marker convention

`// TODO(supabase): supabase.from('scenes').select(...)`. The `TODO(supabase)` tag is greppable (`grep -rn "TODO(supabase)"`), and each names the table or query that will replace it. This is the traceability artifact the proposal promises.

### What gets marked vs moved

- **Moved behind the seam:** scenes, sounds, voice scripts, default preferences.
- **Marked in place (not moved yet):** user name in `home.greeting` (→ `/users/me`), after-screen sparkline (→ from the session record), session timeline `SCRIPT` and pulse `TARGETS`/thresholds (→ session program config). These are marked because moving them is more invasive than this change wants to be, but they must be traceable.
- **Left as-is, documented:** `CRISIS_NUMBER = "1201"` — region config, not enriched content; stays hard-coded with a comment noting it's intentional.

## Risks / Trade-offs

- **Risk:** `expo-video` behavior on SDK 56 for looping background video. → **Mitigation:** the seam returns an optional `video`; if it's absent or fails, `SceneBackground` falls back to the `still`. The demo works either way.
- **Risk:** bundling four video loops inflates app size. → **Mitigation:** keep clips short (~6–10s seamless loops), compressed to ~1–2 MB; only the session loads video, lazily.
- **Trade-off:** marking-in-place (rather than moving) some data leaves partial inconsistency — some content is behind the seam, some is just commented. Accepted: moving everything at once is a bigger change than the demo timeline allows, and the markers keep it honest.

## Migration Plan

No data migration. When the Supabase schema exists, each `content.ts` function body swaps from local data to a `supabase.from(...)` query, call sites gain `await`. Rollback = revert; local data is still in the bundle.
