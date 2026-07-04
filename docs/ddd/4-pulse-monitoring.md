---
title: "Bounded Context: Pulse Monitoring"
tags: [ddd, bounded-context, pulse, privacy]
audience: product, frontend-dev
status: reviewed
---

# ④ Pulse Monitoring  *(Supporting)*

> Index: [`README.md`](./README.md) · PRD: [`../prd.md`](../prd.md) §6.1, §9

**Responsibility:** provide a pulse stream (HealthKit when available, otherwise a
mocked phase-aware generator), measure per-session HR baseline, and publish
`PulseSpiked` / `PulseNormalized` signals. **On-device only.**

## Tactical model

**No aggregate.** Modeled as domain services + value objects.

- **Value objects:** `PulseReading` (bpm at a tick); `PulsePhase` (`baseline | rising | peak | settling`) — the mock generator's behavioral arc, distinct from the walk's clinical `MachineState`.
- **Domain services:**
  - `PulseSource` — HealthKit stream (future ACL) or mock generator fallback.
  - `BaselineMeasurer` — collects HR readings during `AMBIENT_FADE_IN` and computes a per-session mean.
  - `ThresholdDetector` — emits `PulseSpiked` when HR ≥ baseline × 1.15 sustained ≥ 8 s; emits `PulseNormalized` when HR ≤ baseline × 0.90.
  - `BLEWatcher` — emits `WatchDisconnected` after 8 s with no readings; emits `WatchReconnected` on recovery.
- **Domain events:** `PulseSampled`, `PulseSpiked`, `PulseNormalized`, `WatchDisconnected`, `WatchReconnected`.

## Clinical parameters (locked, Q1-Q3 answers)

| Parameter | Value |
|---|---|
| Baseline window | `AMBIENT_FADE_IN` phase (~2 min) |
| Spike threshold | HR ≥ baseline × 1.15, sustained ≥ 8 s |
| Normalize threshold | HR ≤ baseline × 0.90 |
| Chronic high baseline | Resting HR > 90 BPM: require HR threshold + manual distress button for `PulseSpiked` |
| BLE tolerance | 8 s gap before `WatchDisconnected` |
| Baseline fallback | 74 BPM if `AMBIENT_FADE_IN` produced no readings |

## Invariants

- The pulse stream **stays on-device**; never posted to Supabase unless the user
  explicitly shares a walk (privacy boundary, PRD §9). *(Cross-cutting policy 3.)*
- Falls back to the mocked phase-aware generator when HealthKit is unavailable.
- `PulseSpiked` is only emitted from `ADAPTIVE_LOOP`; spike state resets on any other state.

## Relationships

- Publishes `PulseSpiked` / `PulseNormalized` to Exposure Session (trigger gain response).
- Publishes `WatchDisconnected` / `WatchReconnected` to Exposure Session (banner + manual mode).
- Future ACL to **HealthKit / Apple Watch** — the event seam is live; only the source needs swapping.

## Today (code mapping)

- `src/lib/integrations/pulse.ts` — mock generator (`usePulse`) + `PulsePhase` type. Still the pulse source; HealthKit ACL pending.
- `src/hooks/usePulseMonitor.ts` — **real event seam is live**: wraps mock generator, measures baseline, detects spikes via threshold logic, tracks BLE connectivity, handles chronic high-baseline dual-source.

## Gaps

- **HealthKit adapter absent** — `usePulseMonitor` uses the mock generator as fallback. The `PulseSpiked`/`PulseNormalized` seam is ready; the HealthKit ACL is a separate future change.
- **Cross-session escalation** — no automatic escalation if the patient never spikes. Clinical protocol pending (Dudi Efrati).
