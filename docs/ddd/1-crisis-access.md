---
title: "Bounded Context: Crisis Access"
tags: [ddd, bounded-context, crisis, safety]
audience: product, frontend-dev
status: reviewed
---

# ① Crisis Access  *(Supporting — safety floor)*

> Index: [`README.md`](./README.md) · Spec: [`crisis-access`](../../openspec/specs/crisis-access/spec.md)

**Everything yields to this.** Every other screen, animation, or pitch
consideration is secondary to the crisis sheet working reliably.

**Responsibility:** reach ERAN 1201 + a trusted contact from any screen, fast,
offline, and **untracked**.

## Tactical model

- **Aggregate root: `CrisisSheet`** — `isOpen`, `showingTrustedStub`.
- **Value objects:** `HotlineNumber` (`"1201"`), `TrustedContact` (nullable; stub when none).
- **Domain events (conceptual):** `CrisisSheetOpened`, `CrisisCallInitiated`, `TrustedContactRequested`, `CrisisSheetDismissed`.
  - ⚠️ No event bus exists today — `crisis-store.ts` only flips Zustand state and `CrisisSheet.tsx` calls `Linking.openURL` directly. These name *state transitions to observe*, not emitted objects. (This is by design what keeps them un-loggable — see invariants.)

## Invariants (all safety-critical)

- Opens **offline**, no network dependency. (Spec target: ≤200ms — see compliance flag.)
- **No telemetry** — opening the sheet or tapping call emits *no* backend request. The absence of an event bus is what enforces this; analytics MUST skip these transitions ([`../CONVENTIONS.md`](../CONVENTIONS.md) §171). *(Cross-cutting policy 2.)*
- The app dials via `tel:1201` and **never places the call itself**.
- Affordance is the `i` glyph only; headline never contains *crisis/panic/emergency/help*.
- Always dismissible without action.

## Relationships

- **Upstream** to Exposure Session: publishes `isOpen`; ES observes and pauses
  (downstream conformist). Crisis Access knows nothing about sessions.
- Consumes **Localization** (Open Host Service) for the bilingual headline.
- Hands off to the **iOS dialer** via `tel:1201`.

## Today (code mapping)

- `src/lib/storage/crisis-store.ts` (Zustand state — flips instantly)
- `src/components/CrisisSheet.tsx`, `src/components/CrisisAffordance.tsx`
- `CRISIS_NUMBER` is intentionally hard-coded region config, not content.

## Gaps & compliance flags

- **⚠️ Spec violation — open latency:** the spec requires the sheet usable within
  **200ms**, but `CrisisSheet.tsx:16` animates the slide-in over `SLIDE_MS = 600`.
  State flips instantly; the *visible* sheet lags ~600ms. Warrants a ticket.
- Domain events are conceptual only (no bus) — intentional for the no-telemetry
  invariant, but means there is no in-process hook for, e.g., pausing audio
  beyond the direct `isOpen` read.
