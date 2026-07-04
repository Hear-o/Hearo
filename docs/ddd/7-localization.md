---
title: "Bounded Context: Localization"
tags: [ddd, bounded-context, generic-subdomain, i18n, rtl]
audience: product, frontend-dev
status: reviewed
---

# ⑦ Localization  *(Generic Subdomain, exposed as an Open Host Service)*

> Index: [`README.md`](./README.md) · PRD: [`../prd.md`](../prd.md) §8

**Responsibility:** locale detection, EN/HE strings, and RTL mirroring. A generic,
replaceable subdomain — no competitive advantage, but every context depends on it.

## Tactical model

- **Value objects:** `Lang` (`en|he`), `LocalizedText`.
- **Service:** `localize(text, lang)` with EN fallback; RTL via `I18nManager` + NativeWind `rtl:`.

## Invariant

- Hebrew is the fallback locale; the wordmark (`hear◯`) is never localized.

## Two distinct mechanisms (don't conflate them)

- `src/lib/ui/i18n.ts` — **react-i18next** for *UI strings* (buttons, labels), with
  its own resource bundles.
- `src/lib/content/content.ts#localize` — the **content-domain** bilingual accessor for
  `LocalizedText` objects (scene labels, voice scripts). Different system,
  different failure modes.

## Relationships

- **Open Host Service** to all contexts (notably Exposure Session and Crisis
  Access) via `localize()` + the `LocalizedText` vocabulary. *Not* a Shared Kernel
  — there is no jointly-owned, change-gated kernel, just a small published utility.

## Today (code mapping)

- `src/lib/ui/i18n.ts` (UI strings), `src/lib/content/content.ts#localize` (content bilingual accessor).

## Gaps

- Two parallel localization mechanisms with different failure modes — worth a
  short note in `CONVENTIONS.md` so contributors pick the right one.
