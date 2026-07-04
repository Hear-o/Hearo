# HearO — asset brief (for Roy)

Hi Roy, this is the consolidated list of what's still owed to land the next HearO update. Five new scenarios, plus a few follow-ups on the existing flow.

For context: HearO is a self-guided sound-exposure app for Israeli combat veterans with PTSD. Sessions play a calming ambient soundscape with occasional **trigger sounds** (the things the user is practicing facing without spiraling). Tone is grounded, lived-in, **not** dramatic. The current four scenarios — beach, park, café, quiet road — are the right reference for everything below.

**What's already delivered + integrated**: the 9 new trigger sounds, the 15 trigger illustrations, the extra variation takes on the original 6 triggers, the baby-crying/dog/restaurant audio, and the 5 calming-overlay tracks (warm-piano, floating-pads, neo-classical, distant-water-air, soft-grounding-wash). Thanks 🙏 — those are all live in the build.

**What's still outstanding** (this doc): the 5 new scenarios end-to-end (visuals + ambient + voice narration), variations of the two scene-mapped calming tracks, and 3 missing trigger illustrations. Suggested priority: §1 visuals → §3 ambient tracks → §6 voice narration → §2 calming-track variations → §5 trigger illustrations.

---

## Format spec (applies to everything)

**Audio**
- Format: **MP3, 192 kbps** stereo (mono OK for triggers — see §4)
- Sample rate: **44.1 kHz**
- Loudness: ambient tracks targeted around **−20 LUFS**, triggers around **−12 LUFS** (so triggers stand out without clipping)
- No compression artifacts, no audible noise floor
- Each ambient track must **loop seamlessly** — start and end frames need to match so we can play it on repeat without a click

**Visuals**
- Format: **JPG** (or PNG with a flat background)
- Minimum resolution: **2000 × 1500 px**
- Style: **soft, warm, slightly abstract** — like the current four scenes. Not photo-real, not stock-photo. Time of day matters (see per-scene notes below).
- Two variants per scene:
  1. **Full-bleed** — used as the background behind the session UI. Should still read at very low brightness with text overlaid.
  2. **Card crop** — same image, cropped to roughly **3:2 landscape**, used as a centered preview on the "ready to begin" screen. ~1200 × 800 px works.

**File naming** (lower-case, hyphens, no spaces):
```
ambient/<scene>/01.mp3 … 04.mp3
triggers/<sound-key>/01.mp3 … 04.mp3
scenes/<scene>-full.jpg
scenes/<scene>-card.jpg
calming/soothing-loop.mp3
```

---

## §1 — Five new scenarios

Each scenario below needs: **1 full-bleed image + 1 card crop + 4 ambient tracks**. The activity verb and intended mood are there to keep the work consistent across the three asset types.

### 1a. `party` — House party, evening
- **Mood**: Lived-in, warm. Friends gathered, conversation layered, distant playlist. The listener is at the edge of the room, not in the middle of it. Not loud.
- **Time of day / light**: dusk / evening. Warm interior lighting.
- **Ambient track feel**: distant music underneath (instrumental, not a recognizable song), murmured conversation, occasional laughter that doesn't peak.
- **Visual cue**: living room, soft lamp light, no clear faces — the room as a sensation, not a portrait.

### 1b. `bar` — Quiet bar, evening
- **Mood**: Low-key dive bar, not a nightclub. Intimate.
- **Time of day / light**: night. Low warm ambient lighting, maybe a window with city outside.
- **Ambient track feel**: soft instrumental music underneath, glasses clinking occasionally, low conversation. More restrained than party.
- **Visual cue**: a bar from the patron side — partial view of the bar top, a softly out-of-focus background.

### 1c. `train` — Train carriage, daytime
- **Mood**: Calm, mechanical, rhythmic. The user is seated, looking out.
- **Time of day / light**: daytime. Window light streaming in.
- **Ambient track feel**: steady rail rhythm, ventilation hum, distant voices. Slightly mechanical but not industrial.
- **Visual cue**: train interior, seats in soft focus, window with passing landscape.

### 1d. `bus` — City bus, daytime
- **Mood**: Slightly grittier than the train. Public, in motion, but seated and stable.
- **Time of day / light**: daytime. Window light, harder than train.
- **Ambient track feel**: engine drone, occasional passenger movement, brakes hissing at stops.
- **Visual cue**: bus interior from a window-seat perspective.

### 1e. `supermarket` — Supermarket, daytime
- **Mood**: Mundane. Slightly clinical (fluorescent), but unthreatening.
- **Time of day / light**: daytime. Cool fluorescent overhead.
- **Ambient track feel**: low fluorescent hum, distant cart wheels, faint store music, occasional checkout beeps.
- **Visual cue**: an aisle, soft focus, no people clearly visible.

---

## §2 — Calming overlay track (single asset)

Used when the user taps "Need a moment" inside a session — the app pauses and shows a breathing exercise with this track playing underneath.

- **One track, ~60 seconds, seamless loop.**
- Tone: **nature-adjacent but not literally a scene**. Suggestions: soft pads, faint wind, distant water. Instrumental, no melodic foreground.
- Has to work *regardless* of which session scenario was paused — it shouldn't feel like a fifth scene. More of a wash.

File: `calming/soothing-loop.mp3`

---

## §3 — Trigger sounds (9 new types, 3–4 variations each)

These are the difficult sounds the user is practicing facing. Recorded close to the source, no reverb in post (we add ambience downstream). Variations should be subtly different takes of the same event, not different sounds — so the engine can shuffle without monotony.

| Key | Used in scenario | Description |
|---|---|---|
| `party-shout` | party, bar | A short, loud shout/cheer in a crowd. End-of-night energy, not aggressive. 2–3 s. |
| `glass-breaking` | bar, party, supermarket | A single drinking glass shattering on a hard floor. 1–2 s. |
| `train-horn` | train | The long blast as a train approaches a level crossing. 3–4 s. |
| `brake-squeal` | train, bus | Metal-on-metal high-pitched braking. 2–3 s. |
| `station-announcement` | train | Hebrew + English PA, clipped tone. Source clean — we'll layer the radio distortion in post. 4–6 s. |
| `bus-horn` | bus | A short, lower-pitched honk (distinct from a car horn). 1–2 s. |
| `brake-hiss` | bus | The pneumatic hiss when a bus stops. ~2 s. |
| `checkout-beep` | supermarket | The single beep when a barcode scans. Quick, clean. < 1 s. |
| `pa-announcement` | supermarket | Garbled store PA. Clean Hebrew + English source — we'll add reverb. 4–6 s. |

For each: deliver as `triggers/<key>/01.mp3`, `02.mp3`, `03.mp3` (and `04.mp3` if you have a fourth take you like).

---

## §4 — Already on disk (no action needed)

We have files for these sounds in the repo already, so don't re-source them:

- `baby-crying/` — 3 variations
- `dog/` — 3 variations
- `restaurant/` — 5 variations (busy restaurant ambient noise — could double as bar background if useful)

The existing four scenarios (beach, park, café, quiet road) are also fully delivered. No work needed there.

---

## §5 — Three trigger illustrations still missing

The 15-tile trigger picker has illustrations for everything **except** the three sounds we wired alongside your delivery: `baby-crying`, `dog`, `restaurant`. They render as placeholder blocks right now. When you have a moment, three more illustrations in the same style as the others would close that gap.

File naming: `triggers/baby-crying.png`, `triggers/dog.png`, `triggers/restaurant.png`.

---

## §6 — Voice narration for the 5 new scenarios

Each new scenario gets the same 3-stanza voice structure as the existing four — **opening / during / calming** — recorded in **EN + HE**. So: 5 scenarios × 3 stanzas × 2 languages = **30 voice clips**.

Format matches the originals: ~30 s per clip, mono, soft delivery, neutral tone (no acting, no drama). The HE is the source language since the target audience is Israeli veterans; EN is a parallel translation we'll review against the clinical intent.

**Scripts:**

### 6a. `party`
```
opening   EN  "You're at the party. / The room is warm. / You have space to breathe."
          HE  "אתה במסיבה. / החדר חמים. / יש לך מרחב לנשום."
during    EN  "The room moves around you. / A sound rises through it. / You stay with your breath."
          HE  "החדר נע סביבך. / צליל מתרומם דרכו. / אתה נשאר עם הנשימה שלך."
calming   EN  "That sound is part of the night. / You're still here. / You're still safe."
          HE  "הצליל הזה הוא חלק מהלילה. / אתה עדיין כאן. / אתה עדיין בטוח."
```

### 6b. `bar`
```
opening   EN  "You're sitting at the bar. / The evening is quiet. / The light is low."
          HE  "אתה יושב בבר. / הערב שקט. / האור נמוך."
during    EN  "The room hums around you. / A sound passes through. / You stay where you are."
          HE  "החדר הומה סביבך. / צליל חולף. / אתה נשאר במקומך."
calming   EN  "That sound is part of the room. / You're still in your seat. / You're still safe."
          HE  "הצליל הזה הוא חלק מהחדר. / אתה עדיין בכיסא שלך. / אתה עדיין בטוח."
```

### 6c. `train`
```
opening   EN  "You're on the train. / The wheels are steady. / The window holds the light."
          HE  "אתה ברכבת. / הגלגלים יציבים. / החלון אוחז באור."
during    EN  "The carriage moves with you. / A sound rises through it. / You stay in your seat."
          HE  "הקרון נע איתך. / צליל מתרומם דרכו. / אתה נשאר במקום שלך."
calming   EN  "That sound passes through the car. / You're still on the way. / You're still safe."
          HE  "הצליל הזה חולף בקרון. / אתה עדיין בדרך. / אתה עדיין בטוח."
```

### 6d. `bus`
```
opening   EN  "You're on the bus. / The seat is steady under you. / The window holds the street."
          HE  "אתה באוטובוס. / המושב יציב תחתיך. / החלון אוחז ברחוב."
during    EN  "The bus moves on. / A sound cuts across the ride. / You stay in your seat."
          HE  "האוטובוס ממשיך. / צליל חוצה את הנסיעה. / אתה נשאר במקום שלך."
calming   EN  "That sound belongs to the street. / You're still on the bus. / You're still safe."
          HE  "הצליל הזה שייך לרחוב. / אתה עדיין באוטובוס. / אתה עדיין בטוח."
```

### 6e. `supermarket`
```
opening   EN  "You're at the supermarket. / The cart moves easily. / You have time."
          HE  "אתה בסופרמרקט. / העגלה נעה בקלות. / יש לך זמן."
during    EN  "The aisle stretches out. / A sound cuts across it. / You keep walking."
          HE  "המעבר משתרע הלאה. / צליל חוצה אותו. / אתה ממשיך ללכת."
calming   EN  "That sound is part of the store. / You're still in the aisle. / You're still safe."
          HE  "הצליל הזה הוא חלק מהחנות. / אתה עדיין במעבר. / אתה עדיין בטוח."
```

File naming: `voice/<scene>/intro-{he,en}.mp3`, `voice/<scene>/mid-{he,en}.mp3`, `voice/<scene>/end-{he,en}.mp3` — same convention as the existing scenarios.

---

## §7a — Calming-protocol narration

The "Need a moment" screen runs a 5-step calming protocol with text-only prompts today. Now that the neo-classical track is wired as the background loop under it, we want **voice narration on top** for the three narrative steps. Box-breathing and 5-4-3-2-1 visual prompts stay text-only (the visual UI carries them — voicing them would feel cluttered).

**Tone**: same neutral, grounded delivery as the session-narration voice — slower if anything. Pauses between sentences. The user is anxious when they tap into this; the voice has to anchor.

**Format**: same audio spec as the rest — MP3, 192 kbps, 44.1 kHz, EN + HE. File naming: `calming/<step>-{he,en}.mp3`.

**Scripts**:

```
validation        EN  "It's okay. You're safe now.
                       What you're feeling is anxiety. Anxiety is a wave.
                       It rises, peaks, and falls.
                       I'm here. It will pass."
                  HE  "הכל בסדר. אתה בטוח עכשיו.
                       מה שאתה מרגיש זה חרדה. חרדה היא כמו גל.
                       היא עולה, מגיעה לשיא, ויורדת.
                       אני כאן. זה יעבור."

body-grounding    EN  "Come back to your body.
                       If you're standing, sit. Feel your feet on the floor. Press them down.
                       Feel your weight in the chair."
                  HE  "חזור לגוף שלך.
                       אם אתה עומד, שב. תרגיש את כפות הרגליים על הרצפה. לחץ אותן למטה.
                       תרגיש את משקל הגוף שלך על הכיסא."

close             EN  "Take one more slow breath.
                       The wave has passed. You stayed.
                       That was the work. We'll continue another time."
                  HE  "קח עוד נשימה איטית.
                       הגל עבר. נשארת.
                       זאת הייתה העבודה. נמשיך בפעם הבאה."
```

That's 6 clips total (3 steps × 2 languages).

---

## §7b — Calming-overlay variations

You delivered one file each for warm-piano (beach/park) and floating-pads (cafe/road), plus three generic options. Now that the calming overlay is going to loop during the "Need a moment" protocol, we need **variety so it doesn't feel like the same 30 s repeating**.

Ask: **3–4 variations each** of:
- `warm-piano` (beach/park) — same instrument and mood, different phrasing
- `floating-pads` (cafe/road) — same texture and mood, different phrasing

Same loop spec as before: ~60 s, seamless start/end, ~−20 LUFS. File naming: `calming/warm-piano-01.mp3 … 04.mp3` etc.

The neo-classical / distant-water-air / soft-grounding-wash tracks you already gave us are great as-is — they'll work as scene-agnostic fallbacks.

---

## §8 — Delivery

Easiest: a shared Drive folder mirroring the file naming used in the existing batches. Drop everything in there and ping us. We'll integrate within a few days of receipt.

Rough timing target: **the five-scenario bundle is the main thing.** Visuals first if possible — those unblock our screen layouts. The voice narration and ambient tracks can come right after, in either order; the calming variations + 3 trigger illustrations are smaller and can slot in whenever.

Any questions about mood, edge cases, or the wider context — just ask. The four existing scenarios are the best reference; if you want to listen to them, we can share the current build.

Thanks Roy 🙏
