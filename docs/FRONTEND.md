---
title: Frontend spec
tags: [design, ui, screen-specs, frontend-dev]
audience: frontend-dev, designer
status: stable
---

# HearO — Frontend spec

Design system, screen specs, and implementation notes for the mobile app.

> For product framing, persona, brand reading, scope, and assets needed, see [`../README.md`](../README.md).

## Design language

### Palette

Two surfaces. Most of the app is a **warm light** theme (sand/paper). The Session screen is an intentional exception — it stays an **immersive dark** moment so the scene imagery reads as evening and the voice captions stay legible over it.

**App surface — warm light (Welcome, Permissions, Setup, Home, After, crisis sheet):**

```
bg          #F2EBDD    warm sand/paper — primary surface
bg-elev     #E8DECB    cards, sheets
text        #2E2823    warm near-black — primary text
text-mute   #7A7060    secondary text
accent      #C17A45    terracotta — actions, focus
accent-soft #9A6238    same hue, darker — granted/disabled states
sage        #7E9468    grounding secondary (nature/calm)
critical    #BC6A4F    muted clay — crisis sheet only
```

**Scene surface — immersive dark (Session screen only):**

```
scene-text        #F4EEE3    primary text over scene imagery
scene-text-mute   #CDBBA6    secondary text / breathing ring
scene-accent      #E0A56B    brighter amber — pulse, slider, flash
sceneOverlayBottom #140F0C   dark anchor at the bottom of scene overlays
```

**Why warm light, not dark.** Research on trauma-informed and mental-health UI consistently flags two things: near-black / gray-heavy palettes correlate with depressive affect, and red is *activating* for trauma survivors. So we moved off the near-black base entirely, softened the accent away from red-orange toward terracotta, replaced the alarming pure-red `critical` with a muted clay, and added sage — a calming cool note that keeps the all-warm palette from feeling one-dimensional. Warm earth tones (sand, stone, clay) read as "linen, candlelight" rather than "digital."

**Why the Session screen stays dark.** It's the one immersive moment — an evening walk. The scene photo needs a dark overlay for the serif captions to be legible, and a bright photo-wash would kill the evening mood. So the session keeps its own light-on-dark `scene-*` palette while every other screen is light. This is a deliberate split, the same pattern as a photo viewer inside a light app.

### Scene backgrounds

Session screens are *cinematic with restraint*: a scene image (river, park, cafe, road) sits behind the foreground, covered by a warm-dark gradient overlay strong enough that the imagery reads as mood, not as a photograph. The voice and breathing circle stay quiet on top.

```
Image (cover)
└── LinearGradient (top → middle → bottom)
    top      rgba(36, 27, 22, ~0.82)
    middle   rgba(36, 27, 22, ~0.78)
    bottom   rgba(26, 19, 16, ~0.86)   anchored toward sceneOverlayBottom

During an auto-soften phase, overlay intensity bumps by ~0.08
to match the quieter foreground state.
```

Scenes available as `SceneKey`: `river`, `park`, `cafe`, `road`. Each has a scene-tint gradient (the color hint behind the imagery — green for park, cool teal for river, amber for cafe, dusty tan for road) so even if the network image fails to load, the screen still reads as the right *place*.

The Welcome, Permissions, Setup, Home, and After screens use the flat light `bg`, not scene imagery. Only the Session screen is cinematic — the others are notebook pages.

### Type

```
Display    Frank Ruhl Libre, 28/36
           used for the voice's spoken lines, headings,
           and any moment that should carry weight.
           Free on Google Fonts. Renders beautifully in Hebrew.

Body       Heebo, 17/24
           humanist sans, designed as the Hebrew counterpart
           to Roboto. Pairs naturally with Frank Ruhl Libre.
           Free on Google Fonts.
```

Single family pair across both languages. No serif/sans split between EN and HE — that would break visual coherence.

### Motion

```
default      600ms ease-out
scene xfade  4–7s between session phases
trigger      barely perceptible — single 200ms accent flash
             on the breathing circle. deliberately undramatic.
breathing    4s in, 6s out (slow exhale longer than inhale)
```

## Screen flow

Six screens in the demo path. Settings/profile is post-demo polish.

```
1. Welcome           single sentence + start
2. Permissions       HealthKit + notifications, privacy-framed
3. Setup             scene picker + consented sound list
4. Home              today's moment, ready when you are
5. Session   ★HERO   ambient → voice → trigger → pulse loop
6. After             pulse sparkline + three-option reflection
```

### 1. Welcome

```
┌─────────────────────────┐
│                         │
│                         │
│                         │
│   ─                     │
│                         │
│   a quiet place         │   serif, large
│   to be again.          │
│                         │
│                         │
│                         │
│   begin  →              │   accent, no button chrome
│                         │
└─────────────────────────┘
```

Hebrew: *מקום שקט ללכת בו שוב.* / *התחל*

### 2. Permissions

```
┌─────────────────────────┐
│                         │
│  ─                      │
│                         │
│  two things this app    │
│  will need.             │
│                         │
│  your pulse             │
│  so it knows when to    │
│  slow down for you.     │
│                         │
│  [ allow apple health ] │
│                         │
│  reminders              │
│  to be here when you    │
│  said you would.        │
│                         │
│  [ allow ]              │
│                         │
│  nothing leaves your    │
│  phone unless you ask.  │
│                         │
└─────────────────────────┘
```

The last line is load-bearing. Make it true: no analytics that ping home without consent.

### 3. Setup

```
┌─────────────────────────┐
│  ←                      │
│                         │
│  where would you        │
│  like to be?            │
│                         │
│  ●  river path          │
│  ○  city, evening       │
│  ○  cafe, morning       │
│  ○  quiet road          │
│                         │
│  ─                      │
│                         │
│  which sounds are       │
│  you ready to hear?     │
│                         │
│  pick what feels true.  │
│  you can change this    │
│  anytime.               │
│                         │
│  ☐  car backfire        │
│  ☑  motorcycle          │
│  ☐  helicopter          │
│  ☐  fireworks           │
│  ☐  siren               │
│  ☐  shouting            │
│                         │
│  ready  →               │
│                         │
└─────────────────────────┘
```

Two distinct sections by design. Picking a scene is a *place* decision. Picking sounds is a *consent* decision. They must not blur.

### 4. Home

```
┌─────────────────────────┐
│  i              ≡       │   crisis (i), settings (≡)
│                         │
│  ─                      │
│                         │
│  good evening,          │
│  shai.                  │
│                         │
│  today's moment         │
│                         │
│  river path             │
│  with motorcycle        │
│                         │
│  about six minutes      │
│                         │
│  [      begin       ]   │
│                         │
│  change what's planned  │
│                         │
└─────────────────────────┘
```

Note: "about six minutes" not "6:00". Duration is approximate, not a stopwatch — the journal tone rejects precision in non-pulse contexts.

### 5. Session (hero)

```
┌─────────────────────────┐
│  i                    × │
│                         │
│  beach, evening         │
│                         │
│                         │
│   you're walking        │   voice line, serif,
│   along the beach.      │   fades in/out as voice
│   the waves are quiet.  │   speaks. one line at a time.
│                         │
│          ◯              │   breathing circle
│        ◯   ◯            │   4s in / 6s out
│          ◯              │
│                         │
│                         │
│  softer  ────●────  louder  │   intensity (trigger volume)
│                         │
│  ──────────── 2:14      │
│                         │
│  pulse 78    [ pause ]  │
│                         │
└─────────────────────────┘
```

**Trigger-sound behavior:**

1. Ambient stays at full volume. No visual warning. No countdown.
2. Trigger sound plays at the user's current intensity setting.
3. Breathing circle does one barely-perceptible accent pulse.
4. Voice continues with a calmer script.
5. If pulse > threshold: voice softens further, breathing slows, trigger auto-attenuates below the user's set ceiling. No popup. No alert.

**Intensity control (the slider):**

- Always visible during the session, drag-to-adjust.
- Controls *trigger sound volume only* — ambient soundscape and voice are unaffected.
- The slider position is a **ceiling**, not a fixed level. Automatic pulse-driven response can still drop trigger volume below the user's setting, then return to the ceiling when the pulse normalizes. The two layers never fight: both can only make things softer.
- The level the user lands on at session end becomes the default starting ceiling next time. If a veteran spent today's motorcycle session near *softer*, the app does not assume they are ready for full volume tomorrow.
- No numeric labels, no percentages, no "level 3 of 5". The slider is felt, not read.
- Implementation note: the slider's gesture handler must interrupt any in-flight automatic attenuation animation cleanly. If the user grabs the slider mid-spike-response, the auto-animation must not overwrite their input. Use Reanimated shared values.

### 6. After

```
┌─────────────────────────┐
│                         │
│  ─                      │
│                         │
│  you were here          │
│  for six minutes.       │
│                         │
│  your pulse             │
│                         │
│  ▁▂▃▆▇▅▃▂▁              │
│  72   ··   108   ··  74 │
│                         │
│  ─                      │
│                         │
│  how was that?          │
│                         │
│  ○  still here          │
│  ○  shaken              │
│  ○  steady              │
│                         │
│  done                   │
│                         │
└─────────────────────────┘
```

Three options, deliberately not a 1–5 scale and not good/bad. *Still here* goes first — it's the most honest option for someone who just got through something hard.

## Crisis sheet

Reachable via the **i** glyph on every screen.

```
┌─────────────────────────┐
│  ╭─────────────────╮    │
│  │  need someone   │    │
│  │  to talk to     │    │
│  │  right now?     │    │
│  │                 │    │
│  │  call ERAN      │    │   large, accent
│  │  1201           │    │
│  │                 │    │
│  │  free, 24/7,    │    │
│  │  anonymous.     │    │
│  │                 │    │
│  │  a person you   │    │
│  │  trust   >      │    │
│  │                 │    │
│  │  close          │    │
│  ╰─────────────────╯    │
└─────────────────────────┘
```

Sheet style: `bg-elev`, rounded, no scrim flash. Slides in from bottom at default 600ms ease-out. The phone number is the primary tappable — `tel:1201` URI.

## Bilingual & RTL

- Locale detected at launch via `expo-localization`. Hebrew device → Hebrew UI + RTL layout. Otherwise English.
- Fallback for non-EN/non-HE devices: **Hebrew** (the demo audience is Israeli).
- All copy in `lib/ui/i18n.ts` with `en` and `he` keys.
- Layout mirroring via React Native's `I18nManager.forceRTL` + NativeWind `rtl:` variants. Every margin/arrow/alignment flips automatically.
- Wordmark is the one exception. It stays left-anchored in both layouts because it's a logo, not text.

## Frontend stack

```
Runtime              Expo (managed workflow)
Language             TypeScript
Styling              NativeWind (Tailwind classes for React Native)
Navigation           Expo Router (file-based)
State                Zustand
Fonts                @expo-google-fonts/frank-ruhl-libre,
                     @expo-google-fonts/heebo
Audio                expo-av
Health data          @kingstinct/react-native-healthkit (HealthKit)
i18n                 i18next + react-i18next
Animation            react-native-reanimated
Localization         expo-localization
```

No Redux, no Storybook, no design-system library. Hackathon constraints. Copy-paste components, not black-box ones.

## Project structure

```
app/                  Expo Router screens
  index.tsx           welcome
  permissions.tsx
  setup.tsx
  home.tsx
  session.tsx         the hero
  after.tsx
  _layout.tsx         font loading, i18n init, RTL setup
components/
  BreathingCircle.tsx
  PulseTicker.tsx
  VoiceLine.tsx       fades serif lines in/out
  IntensitySlider.tsx softer / louder, with ceiling semantics
  CrisisSheet.tsx
lib/
  i18n.ts             en + he strings
  audio.ts            preloaded clip player
  pulse.ts            mocked HR generator (for demo) +
                      HealthKit hook (for real watch)
  tokens.ts           palette + spacing exported for use in TS
assets/
  sounds/             ambient + trigger clips
  voice/              pre-recorded TTS lines (en + he)
  fonts/              Frank Ruhl Libre, Heebo
tailwind.config.js    palette + font families
```
