# Voice scripts

Source text for the in-session voice narration on each scene. These are the words a voice actor reads or a TTS pipeline (ElevenLabs, Hume, etc.) takes as input. When a script changes here, regenerate the corresponding clip and replace the asset on disk.

## Files

- [`beach.md`](./beach.md) — Beach walk, evening
- [`park.md`](./park.md) — Forest park, evening
- [`cafe.md`](./cafe.md) — Cafe, morning
- [`road.md`](./road.md) — Quiet road

## Structure (every script)

1. **Opening** — quiet scene-setting, no instructions.
2. **Middle** — pre-trigger briefing: names what's coming, points to the user's tools (intensity slider, crisis `i`), reaffirms the safety contract.
3. **Closing** — affirmation of effort, not outcome.

All three sections are given in English and Hebrew. The technical phase machine in code (`opening` / `during` / `calming` in [`src/lib/content/content.ts`](../src/lib/content/content.ts)) is a different concern — the *opening* and *closing* here map to session start / end, the *middle* lands shortly before the trigger sound enters.

## Tone

- Second person ("you"), present tense.
- No therapy jargon, no trauma vocabulary, no military framing.
- Calm, even, slightly under-energized — the voice is a quiet companion, not a coach.
- Hebrew uses masculine singular as default (matches the combat-veteran persona). When we support a gender preference we'll add feminine variants.

## What the middle section must always include

The middle is the load-bearing section — it carries the safety contract. Every scene's middle MUST mention:

- *That triggers are coming.* No surprises.
- *Breathe through it.* Reinforces the breathing circle.
- *The user is in a safe place.* Scene-anchored ("the beach is still here").
- *The intensity slider* — they can soften the trigger at any time.
- *ERAN 1201* — one tap away via the `i` in the corner. Day and night.

The wording can vary by scene; the substance can't.
