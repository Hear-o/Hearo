---
title: "Bounded Context: User Profile & Consent"
tags: [ddd, bounded-context, profile, consent, persistence]
audience: product, frontend-dev
status: reviewed
---

# ⑥ User Profile & Consent  *(Supporting)*

> Index: [`README.md`](./README.md) · PRD: [`../prd.md`](../prd.md) §6.1, §7

**Responsibility:** hold scene selection, consented sounds, ceiling memory,
permissions, and the resolved display name.

## Tactical model

- **Aggregate root: `UserPreferences`** — selected `scene`, `consentedSounds`, `ceilingMemory` (per sound), resolved `displayName`.
- **Value objects:** `Consent` (a granted sound), `DisplayName` (string | null | unresolved), `CeilingMemory` (per-sound remembered ceiling).
- **Domain events:** `SceneSelected`, `ConsentGranted` / `ConsentRevoked`, `CeilingRemembered`, `DisplayNameResolved`.

## Invariants

- Scene choice and consent are **two distinct decisions** (place vs exposure) —
  never conflated.
- `DisplayName` is tri-state: `undefined` (never resolved) ≠ `null` (resolved,
  none) ≠ a name.

## Ownership note (`ceilingMemory`)

The *durable* per-sound ceiling lives here as user data; **Intensity Control**
([`3-intensity-control.md`](./3-intensity-control.md)) reads it as a read model at
walk start and writes it back on `CeilingPersisted`. The live in-walk ceiling
enforcement stays in `TriggerOutputPolicy`. This split keeps the safety rule out
of the persistence aggregate.

## Relationships

- Provides **read models** to Exposure Session (consent list, scene) and Intensity
  Control (remembered ceiling).
- **ACL** to Supabase via `storage.ts` → `user_preferences`.

## Today (code mapping)

- `src/lib/storage/storage.ts` (ACL for persistence → `user_preferences`)
- `src/lib/ui/displayName.ts`, `src/app/setup.tsx`, `src/app/permissions.tsx`
- ⚠️ `src/lib/storage/session-store.ts` holds the **pre-walk selection** (`scene`,
  `sounds`), **not** running-session state — the name is misleading; Exposure
  Session reads it at mount (`session.tsx` derives `consentedSounds[0]`). In-walk
  state lives in `session.tsx`'s local `useState`, not this store.

## Gaps

- **No persistence of `ceilingMemory`** yet (see Intensity Control gaps).
- `session-store.ts` naming should be reconciled (it is *setup* state).
