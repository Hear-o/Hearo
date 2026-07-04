---
title: "Bounded Context: Content Provisioning"
tags: [ddd, bounded-context, content, supabase-seam]
audience: product, frontend-dev
status: reviewed
---

# ⑤ Content Provisioning  *(Supporting)*

> Index: [`README.md`](./README.md) · PRD: [`../prd.md`](../prd.md) §9 · Change: `migrate-content-to-api`

**Responsibility:** serve scenes, sounds, voice scripts, and default preferences;
be the **Supabase-swap seam** (the ACL where local fallback becomes remote reads).

## Tactical model

- **Aggregates / entities:** `Scene` (label, media, tint, per-phase `VoiceScript`), `Sound` (label, `audioVariations`).
- **Value objects:** `SceneKey`, `SoundKey`, `LocalizedText`, `Preferences` (default scene + sounds).
- **Domain events:** none today (read-mostly) — becomes relevant only when content is remotely versioned.

## Invariants

- Every `Sound` has ≥1 audio variation; variation choice is unpredictable across
  walks (therapeutic).
- Getters return in the canonical `SCENE_ORDER` / `SOUND_ORDER`.

## Authoritative keys (from code, not the PRD)

- `SceneKey` = `beach | park | cafe | road`
- `SoundKey` = `motorcycle | helicopter | fireworks | siren | car-horn | door-slam`
- ⚠️ `prd.md` §13 lists `car-backfire` and `shouting` as assets — those are
  **aspirational and not in `content.ts`**; the code is the source of truth here.

## Relationships

- **Published Language** to Exposure Session (`Scene`/`Sound`/`VoiceScript`).
- **ACL** to Supabase via `content.ts` (the seam).
- Provides `localize` (lives here) — see [`7-localization.md`](./7-localization.md).

## Today (code mapping)

- `src/lib/content/content.ts` — the **ACL seam**; getters stay sync now, gain `await`
  when Supabase lands (`migrate-content-to-api`). This is the behavioral contract
  the test suite locks down.

## Gaps

- **PRD vs code sound set** divergence (above) — align the PRD asset list to code.
- No content-versioning events yet (only needed post-Supabase).
