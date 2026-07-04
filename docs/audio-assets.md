# HearO audio + scene asset deliverables

Single source of truth for what we have, what we need, and what to send to Roy. Edit this file as the canonical request — link it in the Slack/email when sending out.

Owner: **Roy** runs the full asset pipeline — scene visuals (stills + card crops), ambient soundscapes per scenario, trigger sound effects, voice narration recordings (EN + HE), and the calming overlay tracks.

Last updated: 2026-06-20 (v1.1.x — Roy delivered new triggers + calming tracks).

---

## 1. What we already have (no action needed)

### 1a. Scenes shipped in v1.0.9
| Key | Label (EN / HE) | Activity verb (EN / HE) | Still | Ambient (×4 variations) | Voice (intro/mid/end × EN+HE) |
|---|---|---|---|---|---|
| `beach` | Beach, evening / חוף, ערב | Walking on the beach / מהלך על שפת הים | ✓ | ✓ | ✓ |
| `park` | Park, evening / פארק, ערב | Walking through the park / מהלך בפארק | ✓ | ✓ | ✓ |
| `cafe` | Cafe, morning / בית קפה, בוקר | Sitting at the cafe / יושב בבית הקפה | ✓ | ✓ | ✓ |
| `road` | Quiet road / כביש שקט | Walking down a quiet road / מהלך בכביש שקט | ✓ | ✓ | ✓ |

### 1b. Trigger sounds shipped in v1.0.9
| Key | Label (EN / HE) | In-action phrase (EN / HE) | Variations on device |
|---|---|---|---|
| `motorcycle` | Motorcycle / אופנוע | a motorcycle passing by / אופנוע חולף | 4 |
| `car-horn` | Car horn / צפירת מכונית | a car horn nearby / צפירת מכונית בקרבת מקום | 2 |
| `siren` | Siren / סירנה | a siren in the distance / סירנה במרחק | 3 |
| `helicopter` | Helicopter / מסוק | a helicopter overhead / מסוק מעל הראש | 2 |
| `door-slam` | Door slam / דלת נטרקת | a door slamming / דלת נטרקת | 4 |
| `fireworks` | Fireworks / זיקוקים | fireworks going off / זיקוקים מתפוצצים | 4 |

### 1c. Trigger sounds on disk but unwired (re-usable for new scenes — see §3)
- `baby-crying/` — 3 variations
- `dog/` — 3 variations
- `restaurant/` — 5 variations (ambient noise of a busy restaurant; could double as bar background)

---

## 2. v1.0.9 scripts (reference — Roy already recorded these, here for reuse with new scenes)

Each scene has the same 3-stanza structure:
- **Opening** — sets the scene, calms breath
- **During** — acknowledges a trigger arriving, anchors the user
- **Calming** — reassures after the trigger

```
beach.opening   EN  "You're walking / along the beach. / The waves are quiet."
                HE  "אתה הולך / לאורך החוף. / הגלים שקטים."
beach.during    EN  "The water keeps moving. / A sound cuts across it. / You keep walking."
                HE  "המים ממשיכים לזרום. / צליל חוצה אותם. / אתה ממשיך ללכת."
beach.calming   EN  "That sound is part of the day. / You're still by the water. / You're still safe."
                HE  "הצליל הזה הוא חלק מהיום. / אתה עדיין ליד המים. / אתה עדיין בטוח."
```

(Park, cafe, road follow the same pattern — see `src/lib/content/content.ts` for the full text.)

The recordings Roy delivered are 30 s long per clip, used as the disclaimer/mid-session/wind-down voice. New scenes below follow the **exact same pattern** so the recording cadence and timing matches.

---

## 3. New scenarios to add (Party, Bar, Train, Bus, Supermarket)

For each scenario we need:
- **Visuals** (Roy) — one full-bleed scene still (the background on `/session` + `/preparing`), preferably warm and slightly abstract — soft focus, not photo-real.
- **Ambient track** (Roy) — 4 variations, 30 s loops, seamless start/end. Tone: lived-in but not overwhelming, matches the existing 4 scenes' "soundscape, not music" feel.
- **Voice narration** (Roy) — 3 stanzas × EN+HE, scripts below.

### 3a. `party` — House party, evening
- **Label**: Party, evening / מסיבה, ערב
- **Activity**: At a party with friends / במסיבה עם חברים
- **Ambient feel (Roy)**: living-room party — distant music, layered conversation, occasional laughter. Not too loud; the listener is on the edge of the room not in the middle.
- **Default trigger candidates**: `door-slam` (existing), party-shout (NEW), glass-breaking (NEW — see §4)
- **Voice scripts**:
  ```
  party.opening   EN  "You're at the party. / The room is warm. / You have space to breathe."
                  HE  "אתה במסיבה. / החדר חמים. / יש לך מרחב לנשום."
  party.during    EN  "The room moves around you. / A sound rises through it. / You stay with your breath."
                  HE  "החדר נע סביבך. / צליל מתרומם דרכו. / אתה נשאר עם הנשימה שלך."
  party.calming   EN  "That sound is part of the night. / You're still here. / You're still safe."
                  HE  "הצליל הזה הוא חלק מהלילה. / אתה עדיין כאן. / אתה עדיין בטוח."
  ```

### 3b. `bar` — Quiet bar, evening
- **Label**: Bar, evening / בר, ערב
- **Activity**: Sitting at the bar / יושב בבר
- **Ambient feel (Roy)**: low-key dive bar — soft music underneath, glasses clinking occasionally, low conversation. More intimate than the party scene.
- **Default trigger candidates**: glass-breaking (NEW), bar-shout (could reuse party-shout)
- **Voice scripts**:
  ```
  bar.opening     EN  "You're sitting at the bar. / The evening is quiet. / The light is low."
                  HE  "אתה יושב בבר. / הערב שקט. / האור נמוך."
  bar.during      EN  "The room hums around you. / A sound passes through. / You stay where you are."
                  HE  "החדר הומה סביבך. / צליל חולף. / אתה נשאר במקומך."
  bar.calming     EN  "That sound is part of the room. / You're still in your seat. / You're still safe."
                  HE  "הצליל הזה הוא חלק מהחדר. / אתה עדיין בכיסא שלך. / אתה עדיין בטוח."
  ```

### 3c. `train` — Train carriage, daytime
- **Label**: Train / רכבת
- **Activity**: Riding the train / נוסע ברכבת
- **Ambient feel (Roy)**: steady rail rhythm, ventilation hum, far-off voices. Calm but mechanical.
- **Default trigger candidates**: train-horn (NEW), brake-squeal (NEW), station-announcement (NEW)
- **Voice scripts**:
  ```
  train.opening   EN  "You're on the train. / The wheels are steady. / The window holds the light."
                  HE  "אתה ברכבת. / הגלגלים יציבים. / החלון אוחז באור."
  train.during    EN  "The carriage moves with you. / A sound rises through it. / You stay in your seat."
                  HE  "הקרון נע איתך. / צליל מתרומם דרכו. / אתה נשאר במקום שלך."
  train.calming   EN  "That sound passes through the car. / You're still on the way. / You're still safe."
                  HE  "הצליל הזה חולף בקרון. / אתה עדיין בדרך. / אתה עדיין בטוח."
  ```

### 3d. `bus` — City bus, daytime
- **Label**: Bus / אוטובוס
- **Activity**: Riding the bus / נוסע באוטובוס
- **Ambient feel (Roy)**: engine drone, occasional passenger movement, hiss of doors and brakes at stops. Slightly grittier than train.
- **Default trigger candidates**: bus-horn (NEW or reuse car-horn), brake-hiss (NEW), siren (existing — passing emergency vehicle)
- **Voice scripts**:
  ```
  bus.opening     EN  "You're on the bus. / The seat is steady under you. / The window holds the street."
                  HE  "אתה באוטובוס. / המושב יציב תחתיך. / החלון אוחז ברחוב."
  bus.during      EN  "The bus moves on. / A sound cuts across the ride. / You stay in your seat."
                  HE  "האוטובוס ממשיך. / צליל חוצה את הנסיעה. / אתה נשאר במקום שלך."
  bus.calming     EN  "That sound belongs to the street. / You're still on the bus. / You're still safe."
                  HE  "הצליל הזה שייך לרחוב. / אתה עדיין באוטובוס. / אתה עדיין בטוח."
  ```

### 3e. `supermarket` — Supermarket, daytime
- **Label**: Supermarket / סופרמרקט
- **Activity**: Pushing the cart at the supermarket / דוחף את העגלה בסופרמרקט
- **Ambient feel (Roy)**: fluorescent hum, distant cart wheels, faint store music, occasional checkout beeps.
- **Default trigger candidates**: checkout-beep (NEW), pa-announcement (NEW), `baby-crying` (existing on disk, currently unwired)
- **Voice scripts**:
  ```
  supermarket.opening   EN  "You're at the supermarket. / The cart moves easily. / You have time."
                        HE  "אתה בסופרמרקט. / העגלה נעה בקלות. / יש לך זמן."
  supermarket.during    EN  "The aisle stretches out. / A sound cuts across it. / You keep walking."
                        HE  "המעבר משתרע הלאה. / צליל חוצה אותו. / אתה ממשיך ללכת."
  supermarket.calming   EN  "That sound is part of the store. / You're still in the aisle. / You're still safe."
                        HE  "הצליל הזה הוא חלק מהחנות. / אתה עדיין במעבר. / אתה עדיין בטוח."
  ```

---

## 4. New trigger sounds to source (Roy)

For each: ideally 3–4 variations, ~3–5 s each, recorded close to the source (no reverb or compression).

| Key | Use case (scene) | Description |
|---|---|---|
| `party-shout` | party, bar | A short loud shout/cheer in a crowd. Not aggressive — peak-of-the-night energy. |
| `glass-breaking` | bar, party, supermarket | A single drinking glass shattering on a hard floor. |
| `train-horn` | train | The distinctive long blast as the train approaches a level crossing. |
| `brake-squeal` | train, bus | Metal-on-metal high-pitched braking. |
| `station-announcement` | train | Hebrew + English PA: short, clipped, slightly distorted. Roy: please source a CLEAN recording — we'll add radio-distortion in post if needed. |
| `bus-horn` | bus | A short, lower-pitched honk (different from car-horn). |
| `brake-hiss` | bus | The pneumatic hiss when a bus stops. ~2 s. |
| `checkout-beep` | supermarket | The single beep when a barcode scans. Quick, clean. |
| `pa-announcement` | supermarket | Garbled store PA — clean recording, we'll layer reverb. Hebrew + English. |

The `baby-crying`, `dog`, `restaurant` files **already on disk** can be wired into new scenarios without new recordings — Roy doesn't need to re-source those.

---

## 5. Calming-overlay sound (for "Need a moment" pause flow — item 7 v1.0.10)

When the user taps "Need a moment", the session pauses and a soothing audio + box-breathing UI plays. Currently no dedicated track exists.

**Need (Roy)**:
- 1 soothing ambient track, ~60 s, seamless loop. Tone: nature-adjacent but not literally a scene (so it works regardless of which session scene was paused). Suggestions: low pads, soft wind, distant water — instrumental but not "music."
- File: `assets/sounds/calming/soothing-loop.mp3`

---

## 6. Post-trigger grounding narration (v1.0.10 item 8 — OPEN PRODUCT DECISION)

After each trigger burst plays, we want to walk the user through a quick grounding step (box-breathing or 5-4-3-2-1). Two delivery options, undecided:

### Option (a) — Voice narration (needs Roy)
Short scripts (~10 s each) played after each trigger. Scene-agnostic.

```
grounding.breath  EN  "Breathe in for four. / Hold for four. / Breathe out for four."
                  HE  "שאיפה ארבע שניות. / החזקה ארבע. / נשיפה ארבע."
grounding.see     EN  "Notice three things / you can see right now."
                  HE  "שים לב לשלושה דברים / שאתה רואה כרגע."
grounding.touch   EN  "Notice the surface / under your hand."
                  HE  "שים לב למשטח / מתחת לידך."
grounding.feet    EN  "Feel your feet / on the ground."
                  HE  "הרגש את כפות הרגליים / על הקרקע."
```

### Option (b) — Visual overlay only (no new voice assets)
Reuse the existing `BoxBreathingTimer` / `SensoryGroundingStep` components in-session; fade them in over the scene for ~15 s after each trigger.

**Status: waiting on product call (Omer).**

---

## 7. Extended in-session narration (backlog — item 3, deferred from v1.0.10)

We may add more frequent voice check-ins during ADAPTIVE_LOOP (currently one mid-session voice at 4 min). If we do, each scene needs 1–2 additional "check-in" stanzas of the same shape.

Not committing scripts yet — flag and revisit when the clinical direction is firm.

---

## 8. Scene visual assets — additional Roy work for v1.0.10

Beyond ambient + new-scene stills:

- **`/preparing` "scene card" image** (item 5 from v1.0.10 QA) — a centered, framed version of each scene's still, ~600px wide, soft-cropped (not full-bleed). The user said: "the picture in the gap should be that of the scenario." Sits between the eyebrow ("Preparing") and the body ("A quiet moment to settle in.").
- **End-session transition screen** (item 9) — same idea, scene image visible during the wind-down narration before the feedback form.

If Roy delivers the scene stills as transparent PNGs with both full-bleed + framed versions, both screens can reuse the same source.

---

## 9. Recap of asks — current state of the world

**Delivered by Roy so far (v1.1.x):**
1. ✅ 9 new trigger sounds wired (party-shout, glass-breaking, train-horn, brake-squeal, station-announcement, bus-horn, brake-hiss, checkout-beep, pa-announcement) — variation counts 1–4 per sound.
2. ✅ Trigger illustrations for all 15 wired sounds (the 6 originals + the 9 new).
3. ✅ Additional variation takes for the 6 original triggers (motorcycle, helicopter, fireworks, siren, car-horn, door-slam) — appended as 5+ to existing.
4. ✅ Audio for previously-on-disk-but-unwired sounds (baby-crying, dog, restaurant) — wired alongside Roy's new takes.
5. ✅ 5 calming-overlay tracks in `assets/sounds/calming/` (warm-piano, floating-pads, neo-classical, distant-water-air, soft-grounding-wash). **`neo-classical` is now wired** as the background loop under the "Need a moment" screen (v1.1.x).

**Still owed by Roy:**
1. **5 new scene stills** (party, bar, train, bus, supermarket) — full-bleed + framed-card versions.
2. **20 ambient soundscape tracks** = 4 variations × 5 new scenes (party, bar, train, bus, supermarket). 30 s seamless loops each.
3. **30 voice narration recordings** = 5 new scenarios × 3 stanzas (opening/during/calming) × 2 languages (EN + HE). Scripts already drafted in §3 above.
4. **Trigger illustrations for baby-crying / dog / restaurant** — the 3 sounds we wired but don't have Roy art for yet.
5. **Variations of the calming tracks** — currently 1 file each for warm-piano + floating-pads (Roy's scene-mapped picks). Need 3–4 variations of each so the calming overlay loop has variety. Same spec as the originals.
6. **Calming-protocol voice narration** — 3 narrative steps (validation / body-grounding / close) × EN + HE = 6 clips. The 5-step protocol on the "Need a moment" screen is text-only today; with the neo-classical loop now playing underneath, voice on top closes the loop. Scripts in §7a of the Roy brief. Box-breathing + 5-4-3-2-1 stay text-only by design.
7. **(Pending Omer's call) Post-trigger grounding voice clips** — 4 short stanzas × EN + HE = 8 clips. Scripts in §6a. Engine hook is wired; we just need the audio.

**Pending product decisions:**
- §6: voice or visual-only for post-trigger grounding? (If voice → adds #6 above to Roy's queue.)
- §7: how much more in-session narration to commission beyond the standard intro/mid/end per scene?
