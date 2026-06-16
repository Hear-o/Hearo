// Content provisioning seam.
//
// Today this returns bundled local data. Every getter is a swap point for a
// Supabase query — see the TODO(supabase) markers, each naming the table /
// query that will eventually serve it. When the schema lands, only the
// bodies here change; call sites stay the same (they gain `await`).

import { ImageSourcePropType } from "react-native";

import { getDefaultSceneForTimeOfDay } from "@/lib/ui/timeOfDay";

export type SceneKey = "beach" | "park" | "cafe" | "road";
export type SoundKey =
  | "motorcycle"
  | "helicopter"
  | "fireworks"
  | "siren"
  | "car-horn"
  | "door-slam";
// Note: dog, baby-crying, restaurant audio files remain on disk under
// ui/assets/sounds/triggers/ — these are off-persona for combat veterans
// (postpartum / K9 / social-anxiety trauma) but kept for a future expansion
// to other trauma profiles.

/** `require()` of a bundled mp3 returns a number from RN's asset registry. */
export type AudioModule = number;
export type Phase = "opening" | "during" | "calming";
export type Lang = "en" | "he";

export type LocalizedText = { en: string; he: string };

export type SceneMedia = {
  // TODO(asset): replace placeholder URIs with bundled, scene-accurate media in
  // ui/assets/scenes/ (still: require(...), video: require(...)). The scene tint
  // below is the guaranteed-correct fallback — it always renders the right mood
  // even if the image fails to load.
  still?: ImageSourcePropType | string;
  video?: ImageSourcePropType | string;
};

export type Scene = {
  key: SceneKey;
  label: LocalizedText;
  short: LocalizedText;
  /** Activity-verb phrase used on Home's "today's experience" block.
   *  e.g. "Sitting at the cafe", "Walking through the park". Includes the
   *  preposition + scene noun so each scene can use whatever phrasing
   *  reads naturally — no template substitution needed at the call site. */
  activity: LocalizedText;
  media: SceneMedia;
  tint: { top: string };
  voice: Record<Phase, LocalizedText>;
};

export type Sound = {
  key: SoundKey;
  label: LocalizedText;
  /** Trigger-as-action phrase used on Home below the scene's activity.
   *  e.g. "a motorcycle passing by", "a helicopter flying overhead". The
   *  Home composes it as "with {inAction}", so the noun goes here. */
  inAction: LocalizedText;
  // TODO(supabase): `sound_variations` table — each row a (sound_id, audio_url, duration_ms).
  // Variations exist so the user can't anticipate the exact clip — a small but
  // therapeutically meaningful unpredictability.
  audioVariations: AudioModule[];
};

export type Preferences = {
  scene: SceneKey;
  sounds: SoundKey[];
};

export function localize(text: LocalizedText, lang: string): string {
  return lang === "he" ? text.he : text.en;
}

// TODO(supabase): `scenes` table (+ join `scene_voice_lines` keyed by scene + phase + lang).
const SCENES: Record<SceneKey, Scene> = {
  beach: {
    key: "beach",
    label: { en: "Beach, evening", he: "חוף, ערב" },
    short: { en: "Beach", he: "חוף" },
    activity: { en: "Walking on the beach", he: "מהלך על שפת הים" },
    media: {
      still: require("@/assets/scenes/beach.png"),
    },
    tint: { top: "#3A4F4A" },
    voice: {
      opening: {
        en: "You're walking\nalong the beach.\nThe waves are quiet.",
        he: "אתה הולך\nלאורך החוף.\nהגלים שקטים.",
      },
      during: {
        en: "The water keeps moving.\nA sound cuts across it.\nYou keep walking.",
        he: "המים ממשיכים לזרום.\nצליל חוצה אותם.\nאתה ממשיך ללכת.",
      },
      calming: {
        en: "That sound is part of the day.\nYou're still by the water.\nYou're still safe.",
        he: "הצליל הזה הוא חלק מהיום.\nאתה עדיין ליד המים.\nאתה עדיין בטוח.",
      },
    },
  },
  park: {
    key: "park",
    label: { en: "Park, evening", he: "פארק, ערב" },
    short: { en: "Park", he: "פארק" },
    activity: { en: "Walking through the park", he: "מהלך בפארק" },
    media: {
      still: require("@/assets/scenes/park.png"),
    },
    tint: { top: "#4A4A2C" },
    voice: {
      opening: {
        en: "You're walking\nthrough the park.\nThe evening is soft.",
        he: "אתה הולך\nדרך הפארק.\nהערב רך.",
      },
      during: {
        en: "The trees move around you.\nA sound breaks through.\nYou keep walking.",
        he: "העצים נעים סביבך.\nצליל פורץ.\nאתה ממשיך ללכת.",
      },
      calming: {
        en: "That sound belongs to the park.\nYou're still on the path.\nYou're still safe.",
        he: "הצליל הזה שייך לפארק.\nאתה עדיין על השביל.\nאתה עדיין בטוח.",
      },
    },
  },
  cafe: {
    key: "cafe",
    label: { en: "Cafe, morning", he: "בית קפה, בוקר" },
    short: { en: "Cafe", he: "בית קפה" },
    activity: { en: "Sitting at the cafe", he: "יושב בבית הקפה" },
    media: {
      still: require("@/assets/scenes/cafe.jpg"),
    },
    tint: { top: "#5A3D26" },
    voice: {
      opening: {
        en: "You're sitting\nin the cafe.\nThe morning is quiet.",
        he: "אתה יושב\nבבית הקפה.\nהבוקר שקט.",
      },
      during: {
        en: "The room hums around you.\nA sound rises over it.\nYou stay where you are.",
        he: "החדר הומה סביבך.\nצליל מתרומם מעליו.\nאתה נשאר במקומך.",
      },
      calming: {
        en: "That sound is part of the morning.\nYou're still in your seat.\nYou're still safe.",
        he: "הצליל הזה הוא חלק מהבוקר.\nאתה עדיין בכיסא שלך.\nאתה עדיין בטוח.",
      },
    },
  },
  road: {
    key: "road",
    label: { en: "Quiet road", he: "כביש שקט" },
    short: { en: "Quiet road", he: "כביש שקט" },
    activity: { en: "Walking down a quiet road", he: "מהלך בכביש שקט" },
    media: {
      still: require("@/assets/scenes/road.jpg"),
    },
    tint: { top: "#3D332B" },
    voice: {
      opening: {
        en: "You're walking\nthe quiet road.\nThere's space around you.",
        he: "אתה הולך\nבכביש השקט.\nיש מרחב סביבך.",
      },
      during: {
        en: "The road stretches on.\nA sound arrives.\nYou keep walking.",
        he: "הכביש משתרע הלאה.\nצליל מגיע.\nאתה ממשיך ללכת.",
      },
      calming: {
        en: "That sound passes through.\nYou're still on the road.\nYou're still safe.",
        he: "הצליל הזה חולף.\nאתה עדיין על הכביש.\nאתה עדיין בטוח.",
      },
    },
  },
};

// TODO(supabase): `sounds` table — key, labels by lang.
// Variations live in `sound_variations` (sound_id → audio_url, duration_ms).
const SOUNDS: Record<SoundKey, Sound> = {
  motorcycle: {
    key: "motorcycle",
    label: { en: "Motorcycle", he: "אופנוע" },
    inAction: { en: "a motorcycle passing by", he: "אופנוע חולף" },
    audioVariations: [
      require("@/assets/sounds/triggers/motorcycle/1.mp3"),
      require("@/assets/sounds/triggers/motorcycle/2.mp3"),
      require("@/assets/sounds/triggers/motorcycle/3.mp3"),
      require("@/assets/sounds/triggers/motorcycle/4.mp3"),
    ],
  },
  helicopter: {
    key: "helicopter",
    label: { en: "Helicopter", he: "מסוק" },
    inAction: { en: "a helicopter overhead", he: "מסוק מעל הראש" },
    audioVariations: [
      require("@/assets/sounds/triggers/helicopter/1.mp3"),
      require("@/assets/sounds/triggers/helicopter/2.mp3"),
    ],
  },
  fireworks: {
    key: "fireworks",
    label: { en: "Fireworks", he: "זיקוקים" },
    inAction: { en: "fireworks going off", he: "זיקוקים מתפוצצים" },
    audioVariations: [
      require("@/assets/sounds/triggers/fireworks/1.mp3"),
      require("@/assets/sounds/triggers/fireworks/2.mp3"),
      require("@/assets/sounds/triggers/fireworks/3.mp3"),
      require("@/assets/sounds/triggers/fireworks/4.mp3"),
    ],
  },
  siren: {
    key: "siren",
    label: { en: "Siren", he: "סירנה" },
    inAction: { en: "a siren in the distance", he: "סירנה במרחק" },
    audioVariations: [
      require("@/assets/sounds/triggers/siren/1.mp3"),
      require("@/assets/sounds/triggers/siren/2.mp3"),
      require("@/assets/sounds/triggers/siren/3.mp3"),
    ],
  },
  "car-horn": {
    key: "car-horn",
    label: { en: "Car horn", he: "צפירת מכונית" },
    inAction: { en: "a car horn nearby", he: "צפירת מכונית בקרבת מקום" },
    audioVariations: [
      require("@/assets/sounds/triggers/car-horn/1.mp3"),
      require("@/assets/sounds/triggers/car-horn/2.mp3"),
    ],
  },
  "door-slam": {
    key: "door-slam",
    label: { en: "Door slam", he: "דלת נטרקת" },
    inAction: { en: "a door slamming", he: "דלת נטרקת" },
    audioVariations: [
      require("@/assets/sounds/triggers/door-slam/1.mp3"),
      require("@/assets/sounds/triggers/door-slam/2.mp3"),
      require("@/assets/sounds/triggers/door-slam/3.mp3"),
      require("@/assets/sounds/triggers/door-slam/4.mp3"),
    ],
  },
};

export const SCENE_ORDER: SceneKey[] = ["beach", "park", "cafe", "road"];
// Ordered roughly by how commonly users encounter each trigger in daily urban
// life — most encountered first, so the picker reads as a familiar list.
export const SOUND_ORDER: SoundKey[] = [
  "motorcycle",
  "car-horn",
  "siren",
  "helicopter",
  "door-slam",
  "fireworks",
];

// TODO(supabase): `supabase.from('scenes').select('*, scene_voice_lines(*)')`
export function getScenes(): Scene[] {
  return SCENE_ORDER.map((k) => SCENES[k]);
}

export function getScene(key: SceneKey): Scene {
  return SCENES[key];
}

// TODO(supabase): `supabase.from('scene_voice_lines').select().eq('scene', scene).eq('phase', phase).eq('lang', lang).single()`
export function getVoiceScript(scene: SceneKey, phase: Phase, lang: string): string {
  return localize(SCENES[scene].voice[phase], lang);
}

// TODO(supabase): `supabase.from('sounds').select('*, sound_variations(*)')`
export function getSounds(): Sound[] {
  return SOUND_ORDER.map((k) => SOUNDS[k]);
}

export function getSound(key: SoundKey): Sound {
  return SOUNDS[key];
}

// TODO(supabase): `user_preferences` row keyed by `auth.uid()` — scene, consented sounds,
// learned intensity ceilings per sound.
export function getDefaultPreferences(): Preferences {
  // Scene default follows the device's local time of day. Once we persist
  // user preferences (zustand-persist + storage seam), the persisted choice
  // takes precedence and this default only applies on first launch.
  return {
    scene: getDefaultSceneForTimeOfDay(),
    sounds: ["motorcycle"],
  };
}

// ── Ambient tracks ────────────────────────────────────────────────────────

/** A looping ambient soundscape asset. */
export type AmbientTrack = {
  key: string;
  label: LocalizedText;
  // TODO(supabase): `ambient_tracks` table — key, labels, cdn_url, sha256.
  // AudioModule (require()) for the bundled fallback; string CDN URI otherwise.
  source: AudioModule | string;
  /** SHA-256 of the CDN file — used by asset-cache for freshness checks. */
  sha256?: string;
};

/** Returns true when a source field is still an unresolved placeholder.
 *  Guards against passing placeholder strings to AudioEngine.loadBuffers(). */
export function isPlaceholderSource(source: AudioModule | string): boolean {
  return typeof source === "string" && source.startsWith("TODO_");
}

// Bundled ambient tracks per scene — one variation is picked randomly at
// session start so repeat sessions feel slightly different.
// TODO(supabase): `ambient_tracks` table — replace require() with CDN URIs.
const AMBIENT_TRACKS: Record<SceneKey, { label: LocalizedText; variations: AudioModule[] }> = {
  beach: {
    label: { en: "Ocean shore", he: "חוף הים" },
    variations: [
      require("@/assets/sounds/ambient/beach/Soothing_ocean_shore_1-1780143780490.mp3"),
      require("@/assets/sounds/ambient/beach/Soothing_ocean_shore_2-1780143780491.mp3"),
      require("@/assets/sounds/ambient/beach/Soothing_ocean_shore_3-1780143780491.mp3"),
      require("@/assets/sounds/ambient/beach/Soothing_ocean_shore_4-1780143781749.mp3"),
    ],
  },
  park: {
    label: { en: "Forest ambience", he: "יער" },
    variations: [
      require("@/assets/sounds/ambient/forest/Immersive_outdoor_so_1-1780143574058.mp3"),
      require("@/assets/sounds/ambient/forest/Immersive_outdoor_so_2-1780143574059.mp3"),
      require("@/assets/sounds/ambient/forest/Immersive_outdoor_so_3-1780143574059.mp3"),
      require("@/assets/sounds/ambient/forest/Immersive_outdoor_so_4-1780143574060.mp3"),
    ],
  },
  cafe: {
    label: { en: "Coffee shop", he: "בית קפה" },
    variations: [
      require("@/assets/sounds/ambient/coffee shop/Realistic_indoor_cof_1-1780143636373.mp3"),
      require("@/assets/sounds/ambient/coffee shop/Realistic_indoor_cof_2-1780143636374.mp3"),
      require("@/assets/sounds/ambient/coffee shop/Realistic_indoor_cof_3-1780143636374.mp3"),
      require("@/assets/sounds/ambient/coffee shop/Realistic_indoor_cof_4-1780143637364.mp3"),
    ],
  },
  road: {
    label: { en: "City street", he: "רחוב עירוני" },
    variations: [
      require("@/assets/sounds/ambient/street/Steady_urban_city_st_1-1780143711219.mp3"),
      require("@/assets/sounds/ambient/street/Steady_urban_city_st_2-1780143711220.mp3"),
      require("@/assets/sounds/ambient/street/Steady_urban_city_st_3-1780143711220.mp3"),
      require("@/assets/sounds/ambient/street/Steady_urban_city_st_4-1780143711220.mp3"),
    ],
  },
};

// TODO(supabase): `supabase.from('ambient_tracks').select('*').eq('scene', scene)`
export function getAmbientTrack(scene: SceneKey): AmbientTrack {
  const track = AMBIENT_TRACKS[scene];
  const source = track.variations[Math.floor(Math.random() * track.variations.length)];
  return { key: `ambient/${scene}`, label: track.label, source };
}

// ── Voice clips ───────────────────────────────────────────────────────────

/** A pre-recorded voice clip played at specific session moments. */
export type VoiceClip = {
  key: "disclaimer" | "mid-session" | "wind-down";
  label: LocalizedText;
  // TODO(supabase): `voice_clips` table — key, scene, lang, cdn_url, sha256, duration_ms.
  source: AudioModule | string;
  sha256?: string;
  durationMs?: number;
};

export type VoiceClipKey = VoiceClip["key"];

type VoiceLang = "en" | "he";

// Bundled narration: one (scene, moment, lang) triple → one bundled mp3.
// File naming convention: assets/sounds/voice/{scene}/{moment}-{lang}.mp3.
// Index order in the returned array matches AudioEngine's playVoiceClip(index)
// contract — 0=DISCLAIMER, 1=MID_SESSION, 2=WIND_DOWN — so callers don't have
// to map keys to indices.
// TODO(supabase): `voice_clips` table replaces this require() lattice.
const VOICE_TRACKS: Record<SceneKey, Record<VoiceLang, { intro: AudioModule; mid: AudioModule; end: AudioModule }>> = {
  beach: {
    he: {
      intro: require("@/assets/sounds/voice/beach/intro-he.mp3"),
      mid: require("@/assets/sounds/voice/beach/mid-he.mp3"),
      end: require("@/assets/sounds/voice/beach/end-he.mp3"),
    },
    en: {
      intro: require("@/assets/sounds/voice/beach/intro-en.mp3"),
      mid: require("@/assets/sounds/voice/beach/mid-en.mp3"),
      end: require("@/assets/sounds/voice/beach/end-en.mp3"),
    },
  },
  park: {
    he: {
      intro: require("@/assets/sounds/voice/park/intro-he.mp3"),
      mid: require("@/assets/sounds/voice/park/mid-he.mp3"),
      end: require("@/assets/sounds/voice/park/end-he.mp3"),
    },
    en: {
      intro: require("@/assets/sounds/voice/park/intro-en.mp3"),
      mid: require("@/assets/sounds/voice/park/mid-en.mp3"),
      end: require("@/assets/sounds/voice/park/end-en.mp3"),
    },
  },
  cafe: {
    he: {
      intro: require("@/assets/sounds/voice/cafe/intro-he.mp3"),
      mid: require("@/assets/sounds/voice/cafe/mid-he.mp3"),
      end: require("@/assets/sounds/voice/cafe/end-he.mp3"),
    },
    en: {
      intro: require("@/assets/sounds/voice/cafe/intro-en.mp3"),
      mid: require("@/assets/sounds/voice/cafe/mid-en.mp3"),
      end: require("@/assets/sounds/voice/cafe/end-en.mp3"),
    },
  },
  road: {
    he: {
      intro: require("@/assets/sounds/voice/road/intro-he.mp3"),
      mid: require("@/assets/sounds/voice/road/mid-he.mp3"),
      end: require("@/assets/sounds/voice/road/end-he.mp3"),
    },
    en: {
      intro: require("@/assets/sounds/voice/road/intro-en.mp3"),
      mid: require("@/assets/sounds/voice/road/mid-en.mp3"),
      end: require("@/assets/sounds/voice/road/end-en.mp3"),
    },
  },
};

const VOICE_LABELS: { key: VoiceClipKey; label: LocalizedText }[] = [
  { key: "disclaimer", label: { en: "Session intro", he: "פתיח הסשן" } },
  { key: "mid-session", label: { en: "Halfway check-in", he: "מחצית הסשן" } },
  { key: "wind-down", label: { en: "Session close", he: "סיום הסשן" } },
];

// Resolve the lang. i18next gives us either "en" / "he" exactly or a regional
// variant like "en-US" / "he-IL". We only have two recordings, so anything
// that's not en/he falls back to he (matches the i18n init default).
function resolveVoiceLang(lang: string): VoiceLang {
  return lang.startsWith("en") ? "en" : "he";
}

// TODO(supabase): `supabase.from('voice_clips').select('*').eq('scene', scene).eq('lang', lang)`
export function getVoiceClips(scene: SceneKey, lang: string): VoiceClip[] {
  const voiceLang = resolveVoiceLang(lang);
  const tracks = VOICE_TRACKS[scene][voiceLang];
  return [
    { ...VOICE_LABELS[0], source: tracks.intro },
    { ...VOICE_LABELS[1], source: tracks.mid },
    { ...VOICE_LABELS[2], source: tracks.end },
  ];
}

// ── Psycho-education ────────────────────────────────────────────────────────
//
// One-time, before-first-session content. Source: Dr. Michal Hirschman,
// 2026-06-09 meeting (see docs/research/psychoeducation-hirschman.md). Hebrew
// is the source language; English is the translation reviewed against the
// clinical intent.

export type PsychoEducationContent = {
  /** Top-of-screen label, uppercase-tracked. */
  eyebrow: LocalizedText;
  /** Display-serif heading. */
  heading: LocalizedText;
  /** One paragraph per array entry — renders as separate <Text> blocks. */
  body: LocalizedText[];
  /** Continue / acknowledge label. */
  continueLabel: LocalizedText;
};

// TODO(supabase): `psycho_education` table — eyebrow/heading/body/cta per lang.
const PSYCHO_EDUCATION: PsychoEducationContent = {
  eyebrow: {
    en: "Before we start",
    he: "לפני שמתחילים",
  },
  heading: {
    en: "Your body is not\nbroken. It's on\nemergency settings.",
    he: "הגוף שלך לא\nמקולקל. הוא על\nהגדרות חירום.",
  },
  body: [
    {
      en: "When your body senses danger, an alarm kicks in. Heart races, breath gets shallow, muscles tense. That's the amygdala, your built-in smoke detector. It kept you alive.",
      he: "כשהגוף שלך מזהה סכנה, אזעקה מופעלת. הדופק מהיר, הנשימה שטחית, השרירים נדרכים. זאת האמיגדלה, גלאי העשן הפנימי שלך. היא שמרה עליך.",
    },
    {
      en: "After the danger passes, the detector usually stays on max sensitivity. A sound, a smell, a place can fire the alarm even when nothing's wrong. That's not a malfunction. It's a protection system that adapted to keep you safe.",
      he: "אחרי שהסכנה חולפת, הגלאי לרוב נשאר ברגישות שיא. צליל, ריח או מקום יכולים להפעיל את האזעקה גם כשאין סכנה. זה לא קלקול. זאת מערכת הגנה שהתאימה את עצמה כדי לשמור עליך.",
    },
    {
      en: "Here, gradually and in a safe space, we'll teach the system that the danger has passed.",
      he: "כאן, בהדרגה ובמרחב מוגן, נלמד את המערכת שהסכנה חלפה.",
    },
  ],
  continueLabel: {
    en: "I'm ready",
    he: "אני מוכן",
  },
};

// TODO(supabase): `supabase.from('psycho_education').select('*').eq('key', 'first-session').single()`
export function getPsychoEducation(): PsychoEducationContent {
  return PSYCHO_EDUCATION;
}

// ── Calming protocol ────────────────────────────────────────────────────────
//
// User-initiated parasympathetic-regulation flow (B-03 v1). Source: Dr. Michal
// Hirschman, 2026-06-09 (see docs/voice-scripts/calming.md). Five steps in
// order, no skip. Distinct from `exposure-session/voice.calming` — that's the
// voice script *inside* a session when pulse spikes; this is the user-tapped
// flow that *ends* a session.

export type CalmingValidationStep = {
  kind: "validation";
  text: LocalizedText;
  durationMs: number;
};

export type CalmingBodyGroundingStep = {
  kind: "body-grounding";
  text: LocalizedText;
  durationMs: number;
};

export type CalmingBoxBreathingStep = {
  kind: "box-breathing";
  cycles: number;
  phaseMs: number;
  prompts: {
    inhale: LocalizedText;
    hold: LocalizedText;
    exhale: LocalizedText;
  };
};

export type CalmingSensoryStep = {
  kind: "sensory-grounding";
  steps: { count: number; prompt: LocalizedText; durationMs: number }[];
};

export type CalmingCloseStep = {
  kind: "close";
  text: LocalizedText;
  durationMs: number;
};

export type CalmingProtocolStep =
  | CalmingValidationStep
  | CalmingBodyGroundingStep
  | CalmingBoxBreathingStep
  | CalmingSensoryStep
  | CalmingCloseStep;

const CALMING_PROTOCOL: CalmingProtocolStep[] = [
  {
    kind: "validation",
    text: {
      en: "It's okay. You're safe now.\n\nWhat you're feeling is anxiety. Anxiety is a wave. It rises, peaks, and falls.\n\nI'm here. It will pass.",
      he: "הכל בסדר. אתה בטוח עכשיו.\n\nמה שאתה מרגיש זה חרדה. חרדה היא כמו גל. היא עולה, מגיעה לשיא, ויורדת.\n\nאני כאן. זה יעבור.",
    },
    durationMs: 12_000,
  },
  {
    kind: "body-grounding",
    text: {
      en: "Come back to your body.\n\nIf you're standing, sit. Feel your feet on the floor. Press them down.\n\nFeel your weight in the chair.",
      he: "חזור לגוף שלך.\n\nאם אתה עומד, שב. תרגיש את כפות הרגליים על הרצפה. לחץ אותן למטה.\n\nתרגיש את משקל הגוף שלך על הכיסא.",
    },
    durationMs: 10_000,
  },
  {
    kind: "box-breathing",
    cycles: 2,
    phaseMs: 4_000,
    prompts: {
      inhale: { en: "Breathe in", he: "שאיפה" },
      hold: { en: "Hold", he: "החזקה" },
      exhale: { en: "Breathe out", he: "נשיפה" },
    },
  },
  {
    kind: "sensory-grounding",
    steps: [
      {
        count: 3,
        prompt: {
          en: "Notice 3 things\nyou can see\naround you.",
          he: "שים לב ל-3 דברים\nשאתה יכול לראות\nברגע זה.",
        },
        durationMs: 9_000,
      },
      {
        count: 2,
        prompt: {
          en: "Notice 2 sounds\nyou can hear.",
          he: "שים לב ל-2 צלילים\nשאתה יכול לשמוע.",
        },
        durationMs: 9_000,
      },
      {
        count: 1,
        prompt: {
          en: "Notice 1 texture\nyou can touch:\nyour clothing,\nthe surface near you.",
          he: "שים לב למרקם אחד\nשאתה יכול לגעת בו:\nהבגד שלך,\nהמשטח שלידך.",
        },
        durationMs: 9_000,
      },
    ],
  },
  {
    kind: "close",
    text: {
      en: "Take one more slow breath.\n\nThe wave has passed. You stayed.\n\nThat was the work. We'll continue another time.",
      he: "קח עוד נשימה איטית.\n\nהגל עבר. נשארת.\n\nזאת הייתה העבודה. נמשיך בפעם הבאה.",
    },
    durationMs: 14_000,
  },
];

// TODO(supabase): `supabase.from('calming_protocol').select('*').order('sort_order')`
export function getCalmingProtocol(): CalmingProtocolStep[] {
  return CALMING_PROTOCOL;
}

// ── Clinical screening (PC-PTSD-5) ──────────────────────────────────────────
//
// Primary Care PTSD Screen for DSM-5 (Prins et al., 2016). Public domain,
// distributed by the VA National Center for PTSD. EN item text is verbatim
// from the official PDF. HE items are draft forward-translations, every one
// marked TODO(hirschman-review) — DO NOT release a Hebrew-locale build until
// Dr. Hirschman has signed off on these strings.
//
// Cutoff at score ≥ 3 (sens .95, spec .85; Prins et al., 2016) — used by
// /screening to gate above-threshold users into a clinician-recommendation
// outcome screen. See docs/research/clinical-screening-review.md.

export type PcPtsd5Content = {
  /** Version tag bumped whenever the wording or cutoff changes. Persisted on
   *  every screening result so old records can be detected if the instrument
   *  is later revised. */
  version: string;
  cutoff: number;
  intro: {
    eyebrow: LocalizedText;
    heading: LocalizedText;
    body: LocalizedText;
  };
  /** Step 1 — trauma-exposure gate. "Yes" administers the 5 items; "No"
   *  short-circuits to the no-trauma outcome. */
  traumaExposure: {
    prompt: LocalizedText;
    yes: LocalizedText;
    no: LocalizedText;
  };
  /** Step 2 — the 5 PC-PTSD-5 items, asked over the past month after a
   *  user-affirmed traumatic event. */
  items: {
    instructions: LocalizedText;
    yes: LocalizedText;
    no: LocalizedText;
    submit: LocalizedText;
    /** Item text. Order matches the official VA PDF (questions 1–5). */
    questions: LocalizedText[];
  };
  outcomes: {
    noTrauma: { heading: LocalizedText; body: LocalizedText; continueLabel: LocalizedText };
    belowThreshold: { heading: LocalizedText; body: LocalizedText; continueLabel: LocalizedText };
    aboveThreshold: {
      heading: LocalizedText;
      body: LocalizedText;
      // TODO(G-01): add `mativLabel: LocalizedText` and a button affordance
      // in screening.tsx when the Mativ referral deep-link is available.
      continueLabel: LocalizedText;
    };
  };
};

// TODO(supabase): `pc_ptsd5_content` table keyed by version + lang.
const CLINICAL_SCREENING: PcPtsd5Content = {
  version: "pc-ptsd-5-v1-2026-06-11",
  cutoff: 3,
  intro: {
    eyebrow: {
      en: "A quick check-in",
      // TODO(hirschman-review): HE draft pending clinical review.
      he: "כמה שאלות לפני שמתחילים",
    },
    heading: {
      en: "Five short questions\nbefore we begin.",
      // TODO(hirschman-review)
      he: "חמש שאלות קצרות\nלפני שמתחילים.",
    },
    body: {
      en: "These help us understand what's right for you, and whether we should suggest talking to someone alongside the app. Your answers stay on this device.",
      // TODO(hirschman-review)
      he: "השאלות האלה עוזרות לנו להבין מה מתאים לך, ואם כדאי שנציע גם לדבר עם מישהו במקביל לאפליקציה. התשובות שלך נשארות במכשיר הזה.",
    },
  },
  traumaExposure: {
    // EN text is paraphrased from the VA PC-PTSD-5 intro (the official wording
    // is a long enumeration of trauma examples; we condense for mobile while
    // preserving the clinical content). The 5 symptom items below are verbatim.
    prompt: {
      en: "Sometimes things happen to people that are unusually frightening, horrible, or traumatic. A serious accident, a physical or sexual assault, war, seeing someone hurt or killed, losing a loved one to violence.\n\nHave you ever experienced something like that?",
      // TODO(hirschman-review)
      he: "לפעמים קורים לאנשים דברים מפחידים, נוראיים או טראומטיים במיוחד. תאונה חמורה, תקיפה גופנית או מינית, מלחמה, ראייה של מישהו שנפצע או נהרג, אובדן של אדם אהוב באלימות.\n\nהאם אי פעם חווית משהו כזה?",
    },
    yes: { en: "Yes", he: "כן" },
    no: { en: "No", he: "לא" },
  },
  items: {
    instructions: {
      en: "In the past month, have you…",
      // TODO(hirschman-review)
      he: "בחודש האחרון, האם…",
    },
    yes: { en: "Yes", he: "כן" },
    no: { en: "No", he: "לא" },
    submit: {
      en: "Done",
      // TODO(hirschman-review)
      he: "סיום",
    },
    // VA PC-PTSD-5 items, verbatim EN. HE drafted from the source.
    questions: [
      {
        en: "Had nightmares about the event(s), or thought about the event(s) when you did not want to?",
        // TODO(hirschman-review)
        he: "היו לך סיוטים על האירוע, או חשבת עליו כשלא רצית?",
      },
      {
        en: "Tried hard not to think about the event(s), or went out of your way to avoid situations that reminded you of the event(s)?",
        // TODO(hirschman-review)
        he: "השתדלת מאוד לא לחשוב על האירוע, או הלכת רחוק מדרכך כדי להימנע ממצבים שהזכירו לך אותו?",
      },
      {
        en: "Been constantly on guard, watchful, or easily startled?",
        // TODO(hirschman-review)
        he: "היית כל הזמן בכוננות, ערני, או נבהלת בקלות?",
      },
      {
        en: "Felt numb or detached from people, activities, or your surroundings?",
        // TODO(hirschman-review)
        he: "הרגשת חוסר תחושה או ניתוק מאנשים, מפעילויות או מהסביבה שלך?",
      },
      {
        en: "Felt guilty or unable to stop blaming yourself or others for the event(s) or any problems the event(s) may have caused?",
        // TODO(hirschman-review)
        he: "הרגשת אשמה, או לא הצלחת להפסיק להאשים את עצמך או אחרים בגלל האירוע או הבעיות שנגרמו ממנו?",
      },
    ],
  },
  outcomes: {
    noTrauma: {
      heading: {
        en: "Thanks for that.",
        // TODO(hirschman-review)
        he: "תודה.",
      },
      body: {
        en: "Let's get you set up.",
        // TODO(hirschman-review)
        he: "בוא נכין את ההגדרות שלך.",
      },
      continueLabel: {
        en: "Continue",
        // TODO(hirschman-review)
        he: "המשך",
      },
    },
    belowThreshold: {
      heading: {
        en: "Thanks for that.",
        // TODO(hirschman-review)
        he: "תודה.",
      },
      body: {
        en: "Based on what you've shared, the practice you'll find here should be a good fit. If anything changes, you can come back to this check-in from Settings.",
        // TODO(hirschman-review)
        he: "לפי מה ששיתפת, התרגול שכאן אמור להתאים לך. אם משהו ישתנה, תוכל לחזור לבדיקה הזו דרך ההגדרות.",
      },
      continueLabel: {
        en: "Continue",
        // TODO(hirschman-review)
        he: "המשך",
      },
    },
    aboveThreshold: {
      heading: {
        en: "You don't need to\ndo this alone.",
        // TODO(hirschman-review)
        he: "אתה לא חייב\nלעשות את זה לבד.",
      },
      body: {
        en: "What you've shared sounds like something a conversation with someone trained in trauma could really help with. We work with the Mativ Institute and can put you in touch. The app is here either way. You can use it on its own, or alongside that support.",
        // TODO(hirschman-review)
        he: "מה ששיתפת נשמע כמו משהו ששיחה עם איש מקצוע מאומן בטראומה יכולה לעזור איתו. אנחנו עובדים עם מכון מטיב ויכולים לחבר ביניכם. האפליקציה תהיה כאן בכל מקרה. תוכל להשתמש בה בנפרד, או לצד התמיכה הזו.",
      },
      continueLabel: {
        en: "Continue to the app",
        // TODO(hirschman-review)
        he: "המשך לאפליקציה",
      },
    },
  },
};

// TODO(supabase): `supabase.from('pc_ptsd5_content').select('*').eq('version', '...').single()`
export function getClinicalScreening(): PcPtsd5Content {
  return CLINICAL_SCREENING;
}

/** Compute the PC-PTSD-5 outcome from raw step-1 + step-2 answers. Pure
 *  function; the route calls this before persisting + rendering step 3. */
export function computeClinicalScreeningOutcome(
  traumaExposure: boolean,
  answers: boolean[],
  cutoff: number,
): { score: number; outcome: "no-trauma" | "below-threshold" | "above-threshold" } {
  if (!traumaExposure) {
    return { score: 0, outcome: "no-trauma" };
  }
  const score = answers.filter(Boolean).length;
  const outcome = score >= cutoff ? "above-threshold" : "below-threshold";
  return { score, outcome };
}
