// Content provisioning seam.
//
// Today this returns bundled local data. Every getter is a swap point for a
// Supabase query — see the TODO(supabase) markers, each naming the table /
// query that will eventually serve it. When the schema lands, only the
// bodies here change; call sites stay the same (they gain `await`).

import { ImageSourcePropType } from "react-native";

import { getDefaultSceneForTimeOfDay } from "@/lib/ui/timeOfDay";

export type SceneKey =
  | "beach"
  | "park"
  | "cafe"
  | "road"
  // v1.2.0 — Roy's 2026-07-07 drop of 5 new scenes (still + ambient bed each).
  // Voice narration for these is still owed (TODO Roy), so they're wired for
  // the Companion feature (which doesn't need voice) but not yet promoted
  // to the Practice picker until intro/mid/end clips land.
  | "train"
  | "quiet-bar"
  | "house-party"
  | "supermarket"
  | "bus";
export type SoundKey =
  | "motorcycle"
  | "helicopter"
  | "fireworks"
  | "siren"
  | "car-horn"
  | "door-slam"
  // v1.1.x — Roy delivery of 9 new triggers (paired with the 5 new scenarios:
  // Party, Bar, Train, Bus, Supermarket — see docs/roy-asset-brief.md §3).
  | "party-shout"
  | "glass-breaking"
  | "train-horn"
  | "brake-squeal"
  | "station-announcement"
  | "bus-horn"
  | "brake-hiss"
  | "checkout-beep"
  | "pa-announcement"
  // v1.1.x — broader trauma-profile sounds wired in alongside the Roy drop.
  // Off-canonical for combat-veteran focus but useful for partners/parents
  // and future profile expansion (no UI gating on this — they show in the
  // Setup picker like any other).
  | "baby-crying"
  | "dog"
  | "restaurant";

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
  /** Trigger sounds that make sense IN this scene's context — used by Setup
   *  to filter the picker grid (v1.1.x). A helicopter in a quiet road scene
   *  is plausible; a checkout-beep on the beach is not. Keep curated lists
   *  short (3–8 candidates per scene) so the picker stays scannable. */
  triggerCandidates: SoundKey[];
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
  /** Trigger-card illustration shown on the Setup picker (v1.1.x). PNG sourced
   *  externally; require()'d here so Metro bundles it. Optional because future
   *  sound entries may exist before their illustration ships. */
  image?: AudioModule;
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
    triggerCandidates: ["motorcycle", "helicopter", "siren", "fireworks", "dog"],
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
    triggerCandidates: ["dog", "motorcycle", "helicopter", "siren", "baby-crying"],
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
    triggerCandidates: ["car-horn", "door-slam", "siren", "baby-crying", "restaurant", "glass-breaking"],
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
    triggerCandidates: [
      "motorcycle",
      "car-horn",
      "siren",
      "helicopter",
      "bus-horn",
      "brake-squeal",
      "door-slam",
      "dog",
    ],
  },
  // v1.2.0 — Roy's 2026-07-07 drop. Voice narration still owed for each
  // (TODO Roy). Voice fields intentionally empty — the /session Practice
  // flow shouldn't route to these until intro/mid/end recordings arrive.
  // The Companion feature uses only the still + short label + triggerCandidates.
  train: {
    key: "train",
    label: { en: "Train carriage, daytime", he: "קרון רכבת, יום" },
    short: { en: "Train", he: "רכבת" },
    activity: { en: "Riding the train", he: "נסיעה ברכבת" },
    media: { still: require("@/assets/scenes/train.png") },
    tint: { top: "#3B4A5A" },
    voice: {
      // TODO(roy): record intro/mid/end voice for the train scene, EN + HE.
      opening: { en: "", he: "" },
      during: { en: "", he: "" },
      calming: { en: "", he: "" },
    },
    triggerCandidates: ["train-horn", "brake-squeal", "station-announcement", "baby-crying", "brake-hiss"],
  },
  "quiet-bar": {
    key: "quiet-bar",
    label: { en: "Quiet bar, evening", he: "בר שקט, ערב" },
    short: { en: "Quiet bar", he: "בר שקט" },
    activity: { en: "Sitting at a quiet bar", he: "יושב בבר שקט" },
    media: { still: require("@/assets/scenes/quiet-bar.png") },
    tint: { top: "#3A2C24" },
    voice: {
      // TODO(roy): record intro/mid/end voice for the quiet-bar scene.
      opening: { en: "", he: "" },
      during: { en: "", he: "" },
      calming: { en: "", he: "" },
    },
    triggerCandidates: ["glass-breaking", "party-shout", "door-slam", "restaurant"],
  },
  "house-party": {
    key: "house-party",
    label: { en: "House party, evening", he: "מסיבת בית, ערב" },
    short: { en: "House party", he: "מסיבת בית" },
    activity: { en: "At a house party", he: "במסיבת בית" },
    media: { still: require("@/assets/scenes/house-party.png") },
    tint: { top: "#4A2C3D" },
    voice: {
      // TODO(roy): record intro/mid/end voice for the house-party scene.
      opening: { en: "", he: "" },
      during: { en: "", he: "" },
      calming: { en: "", he: "" },
    },
    triggerCandidates: ["party-shout", "glass-breaking", "door-slam", "dog", "baby-crying"],
  },
  supermarket: {
    key: "supermarket",
    label: { en: "Supermarket, daytime", he: "סופרמרקט, יום" },
    short: { en: "Supermarket", he: "סופרמרקט" },
    activity: { en: "Shopping at the supermarket", he: "עושה קניות בסופרמרקט" },
    media: { still: require("@/assets/scenes/supermarket.png") },
    tint: { top: "#3D4A3C" },
    voice: {
      // TODO(roy): record intro/mid/end voice for the supermarket scene.
      opening: { en: "", he: "" },
      during: { en: "", he: "" },
      calming: { en: "", he: "" },
    },
    triggerCandidates: ["checkout-beep", "pa-announcement", "baby-crying", "dog"],
  },
  bus: {
    key: "bus",
    label: { en: "City bus, daytime", he: "אוטובוס עירוני, יום" },
    short: { en: "Bus", he: "אוטובוס" },
    activity: { en: "Riding the bus", he: "נסיעה באוטובוס" },
    media: { still: require("@/assets/scenes/bus.png") },
    tint: { top: "#3D4552" },
    voice: {
      // TODO(roy): record intro/mid/end voice for the bus scene.
      opening: { en: "", he: "" },
      during: { en: "", he: "" },
      calming: { en: "", he: "" },
    },
    triggerCandidates: ["bus-horn", "brake-hiss", "brake-squeal", "baby-crying", "door-slam"],
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
    image: require("@/assets/trigger-images/motorcycle.png"),
  },
  helicopter: {
    key: "helicopter",
    label: { en: "Helicopter", he: "מסוק" },
    inAction: { en: "a helicopter overhead", he: "מסוק מעל הראש" },
    audioVariations: [
      require("@/assets/sounds/triggers/helicopter/1.mp3"),
      require("@/assets/sounds/triggers/helicopter/2.mp3"),
    ],
    image: require("@/assets/trigger-images/helicopter.png"),
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
    image: require("@/assets/trigger-images/fireworks.png"),
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
    image: require("@/assets/trigger-images/siren.png"),
  },
  "car-horn": {
    key: "car-horn",
    label: { en: "Car horn", he: "צפירת מכונית" },
    inAction: { en: "a car horn nearby", he: "צפירת מכונית בקרבת מקום" },
    audioVariations: [
      require("@/assets/sounds/triggers/car-horn/1.mp3"),
      require("@/assets/sounds/triggers/car-horn/2.mp3"),
    ],
    image: require("@/assets/trigger-images/car-horn.png"),
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
    image: require("@/assets/trigger-images/door-slam.png"),
  },
  // v1.1.x — new triggers from Roy's delivery (paired with the 5 new scenarios).
  "party-shout": {
    key: "party-shout",
    label: { en: "Party shout", he: "צעקה במסיבה" },
    inAction: { en: "a shout at a party", he: "צעקה במסיבה" },
    audioVariations: [
      require("@/assets/sounds/triggers/party-shout/1.mp3"),
      require("@/assets/sounds/triggers/party-shout/2.mp3"),
      require("@/assets/sounds/triggers/party-shout/3.mp3"),
    ],
    image: require("@/assets/trigger-images/party-shout.png"),
  },
  "glass-breaking": {
    key: "glass-breaking",
    label: { en: "Glass breaking", he: "כוס נשברת" },
    inAction: { en: "a glass breaking nearby", he: "כוס נשברת בקרבת מקום" },
    audioVariations: [
      require("@/assets/sounds/triggers/glass-breaking/1.mp3"),
      require("@/assets/sounds/triggers/glass-breaking/2.mp3"),
      require("@/assets/sounds/triggers/glass-breaking/3.mp3"),
      require("@/assets/sounds/triggers/glass-breaking/4.mp3"),
    ],
    image: require("@/assets/trigger-images/glass-breaking.png"),
  },
  "train-horn": {
    key: "train-horn",
    label: { en: "Train horn", he: "צפירת רכבת" },
    inAction: { en: "a train horn in the distance", he: "צפירת רכבת במרחק" },
    audioVariations: [
      require("@/assets/sounds/triggers/train-horn/1.mp3"),
      require("@/assets/sounds/triggers/train-horn/2.mp3"),
      require("@/assets/sounds/triggers/train-horn/3.mp3"),
      require("@/assets/sounds/triggers/train-horn/4.mp3"),
    ],
    image: require("@/assets/trigger-images/train-horn.png"),
  },
  "brake-squeal": {
    key: "brake-squeal",
    label: { en: "Brake squeal", he: "חריקת בלמים" },
    inAction: { en: "brakes squealing", he: "חריקת בלמים" },
    audioVariations: [
      require("@/assets/sounds/triggers/brake-squeal/1.mp3"),
      require("@/assets/sounds/triggers/brake-squeal/2.mp3"),
      require("@/assets/sounds/triggers/brake-squeal/3.mp3"),
      require("@/assets/sounds/triggers/brake-squeal/4.mp3"),
      require("@/assets/sounds/triggers/brake-squeal/5.mp3"),
    ],
    image: require("@/assets/trigger-images/brake-squeal.png"),
  },
  "station-announcement": {
    key: "station-announcement",
    label: { en: "Station announcement", he: "כריזה בתחנה" },
    inAction: { en: "a station announcement", he: "כריזה בתחנה" },
    audioVariations: [require("@/assets/sounds/triggers/station-announcement/1.mp3")],
    image: require("@/assets/trigger-images/station-announcement.png"),
  },
  "bus-horn": {
    key: "bus-horn",
    label: { en: "Bus horn", he: "צפירת אוטובוס" },
    inAction: { en: "a bus horn", he: "צפירת אוטובוס" },
    audioVariations: [
      require("@/assets/sounds/triggers/bus-horn/1.mp3"),
      require("@/assets/sounds/triggers/bus-horn/2.mp3"),
      require("@/assets/sounds/triggers/bus-horn/3.mp3"),
    ],
    image: require("@/assets/trigger-images/bus-horn.png"),
  },
  "brake-hiss": {
    key: "brake-hiss",
    label: { en: "Brake hiss", he: "שריקת בלמים" },
    inAction: { en: "a bus braking", he: "אוטובוס מאט" },
    audioVariations: [
      require("@/assets/sounds/triggers/brake-hiss/1.mp3"),
      require("@/assets/sounds/triggers/brake-hiss/2.mp3"),
      require("@/assets/sounds/triggers/brake-hiss/3.mp3"),
    ],
    image: require("@/assets/trigger-images/brake-hiss.png"),
  },
  "checkout-beep": {
    key: "checkout-beep",
    label: { en: "Checkout beep", he: "ביפ בקופה" },
    inAction: { en: "a checkout beeping", he: "ביפ בקופה" },
    audioVariations: [
      require("@/assets/sounds/triggers/checkout-beep/1.mp3"),
      require("@/assets/sounds/triggers/checkout-beep/2.mp3"),
      require("@/assets/sounds/triggers/checkout-beep/3.mp3"),
    ],
    image: require("@/assets/trigger-images/checkout-beep.png"),
  },
  "pa-announcement": {
    key: "pa-announcement",
    label: { en: "Store announcement", he: "כריזה בסופר" },
    inAction: { en: "a store announcement", he: "כריזה בסופר" },
    audioVariations: [
      require("@/assets/sounds/triggers/pa-announcement/1.mp3"),
      require("@/assets/sounds/triggers/pa-announcement/2.mp3"),
    ],
    image: require("@/assets/trigger-images/pa-announcement.png"),
  },
  // v1.1.x — previously-on-disk-but-unwired sounds, now wired with Roy's
  // additional variations. No trigger illustration yet (TODO Roy).
  "baby-crying": {
    key: "baby-crying",
    label: { en: "Baby crying", he: "תינוק בוכה" },
    inAction: { en: "a baby crying", he: "תינוק בוכה" },
    image: require("@/assets/trigger-images/baby-crying.png"),
    audioVariations: [
      require("@/assets/sounds/triggers/baby-crying/1.mp3"),
      require("@/assets/sounds/triggers/baby-crying/2.mp3"),
      require("@/assets/sounds/triggers/baby-crying/3.mp3"),
    ],
  },
  dog: {
    key: "dog",
    label: { en: "Dog barking", he: "כלב נובח" },
    inAction: { en: "a dog barking nearby", he: "כלב נובח בקרבת מקום" },
    image: require("@/assets/trigger-images/dog.png"),
    audioVariations: [
      require("@/assets/sounds/triggers/dog/1.mp3"),
      require("@/assets/sounds/triggers/dog/2.mp3"),
      require("@/assets/sounds/triggers/dog/3.mp3"),
    ],
  },
  restaurant: {
    key: "restaurant",
    label: { en: "Restaurant noise", he: "רעש מסעדה" },
    inAction: { en: "a noisy restaurant", he: "מסעדה הומה" },
    image: require("@/assets/trigger-images/restaurant.png"),
    audioVariations: [
      require("@/assets/sounds/triggers/restaurant/1.mp3"),
      require("@/assets/sounds/triggers/restaurant/2.mp3"),
      require("@/assets/sounds/triggers/restaurant/3.mp3"),
      require("@/assets/sounds/triggers/restaurant/4.mp3"),
      require("@/assets/sounds/triggers/restaurant/5.mp3"),
    ],
  },
};

// SCENE_ORDER — the 4 scenes with recorded voice narration. These are the
// only scenes Practice's SceneCarousel offers (a session needs intro/mid/end
// clips). The 5 v1.2.0 scenes (train / quiet-bar / house-party / supermarket
// / bus) don't have voice yet, so they're excluded here.
export const SCENE_ORDER: SceneKey[] = ["beach", "park", "cafe", "road"];

// COMPANION_SCENE_ORDER — every scene the Companion feature lists. Voice
// isn't required for Companion (no session, just per-scene task ladders),
// so the 5 v1.2.0 scenes appear alongside the originals.
export const COMPANION_SCENE_ORDER: SceneKey[] = [
  "beach",
  "park",
  "cafe",
  "road",
  "train",
  "bus",
  "quiet-bar",
  "house-party",
  "supermarket",
];
// Ordered roughly by how commonly users encounter each trigger in daily urban
// life — most encountered first, so the picker reads as a familiar list.
// v1.1.x adds the 9 new triggers grouped by typical situation
// (transit / shopping / social) after the originals.
export const SOUND_ORDER: SoundKey[] = [
  "motorcycle",
  "car-horn",
  "siren",
  "helicopter",
  "door-slam",
  "fireworks",
  // transit
  "bus-horn",
  "brake-squeal",
  "brake-hiss",
  "train-horn",
  "station-announcement",
  // shopping
  "checkout-beep",
  "pa-announcement",
  // social
  "glass-breaking",
  "party-shout",
  // broader life
  "baby-crying",
  "dog",
  "restaurant",
];

// TODO(supabase): `supabase.from('scenes').select('*, scene_voice_lines(*)')`
export function getScenes(): Scene[] {
  return SCENE_ORDER.map((k) => SCENES[k]);
}

/** Every scene visible in the Companion feature (superset of Practice scenes
 *  — see COMPANION_SCENE_ORDER comment for why). */
export function getCompanionScenes(): Scene[] {
  return COMPANION_SCENE_ORDER.map((k) => SCENES[k]);
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
  train: {
    label: { en: "Train carriage", he: "קרון רכבת" },
    variations: [
      require("@/assets/sounds/ambient/train/1.mp3"),
      require("@/assets/sounds/ambient/train/2.mp3"),
      require("@/assets/sounds/ambient/train/3.mp3"),
      require("@/assets/sounds/ambient/train/4.mp3"),
    ],
  },
  "quiet-bar": {
    label: { en: "Quiet bar", he: "בר שקט" },
    variations: [
      require("@/assets/sounds/ambient/quiet-bar/1.mp3"),
      require("@/assets/sounds/ambient/quiet-bar/2.mp3"),
      require("@/assets/sounds/ambient/quiet-bar/3.mp3"),
    ],
  },
  "house-party": {
    label: { en: "House party", he: "מסיבת בית" },
    variations: [
      require("@/assets/sounds/ambient/house-party/1.mp3"),
      require("@/assets/sounds/ambient/house-party/2.mp3"),
      require("@/assets/sounds/ambient/house-party/3.mp3"),
      require("@/assets/sounds/ambient/house-party/4.mp3"),
    ],
  },
  supermarket: {
    label: { en: "Supermarket", he: "סופרמרקט" },
    variations: [
      require("@/assets/sounds/ambient/supermarket/1.mp3"),
      require("@/assets/sounds/ambient/supermarket/2.mp3"),
      require("@/assets/sounds/ambient/supermarket/3.mp3"),
      require("@/assets/sounds/ambient/supermarket/4.mp3"),
    ],
  },
  bus: {
    label: { en: "City bus", he: "אוטובוס עירוני" },
    variations: [
      require("@/assets/sounds/ambient/bus/1.mp3"),
      require("@/assets/sounds/ambient/bus/2.mp3"),
      require("@/assets/sounds/ambient/bus/3.mp3"),
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
// Partial<Record<...>> because the 5 v1.2.0 scenes (train / quiet-bar /
// house-party / supermarket / bus) don't have voice narration yet — Roy
// still owes intro/mid/end recordings for each. getVoiceClips falls back to
// placeholder sources for scenes without recorded voice; the Practice flow
// only routes to voice-having scenes via SCENE_ORDER, so callers with a
// scene from SCENE_ORDER always get real audio.
const VOICE_TRACKS: Partial<Record<SceneKey, Record<VoiceLang, { intro: AudioModule; mid: AudioModule; end: AudioModule }>>> = {
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
  const tracks = VOICE_TRACKS[scene]?.[voiceLang];
  if (!tracks) {
    // Scene without recorded voice (v1.2.0 Companion-only scenes). Return
    // placeholder-source clips — isPlaceholderSource() flags each so the
    // session flow skips playback rather than crashing. Practice's
    // SceneCarousel filters to SCENE_ORDER, so this branch only trips if
    // a caller reaches a voice-less scene by some other path.
    return [
      { ...VOICE_LABELS[0], source: "placeholder://voice" },
      { ...VOICE_LABELS[1], source: "placeholder://voice" },
      { ...VOICE_LABELS[2], source: "placeholder://voice" },
    ];
  }
  return [
    { ...VOICE_LABELS[0], source: tracks.intro },
    { ...VOICE_LABELS[1], source: tracks.mid },
    { ...VOICE_LABELS[2], source: tracks.end },
  ];
}

// ── Daily affirmations (v1.1.x) ─────────────────────────────────────────────
//
// Short quote shown on the Home screen, one per calendar day. Same quote
// the whole day (deterministic by date), rotates daily.
//
// IMPORTANT — TODO(clinical-review): these are first-pass drafts. Affirmations
// aimed at PTSD recovery are sensitive copy: bad tone (toxic positivity,
// minimization, military-bro vibes) can re-injure. Before shipping to real
// users they MUST be reviewed by the clinical team (Dr. Hirschman). The HE is the source
// language since the target audience is Israeli combat veterans; EN is a
// parallel translation, not the primary.
//
// Editorial rules used in the draft (so reviewers know the constraints):
// - No "you are strong" or "you can do this" cheerleading.
// - No "everything will be okay" minimization of trauma.
// - No military or combat metaphors ("battle", "fight", "victory").
// - Grounded, validating, normalizing. Permission to feel.
// - Two short lines max — they sit under the greeting at body-text size.

const DAILY_AFFIRMATIONS: LocalizedText[] = [
  {
    he: "הזיכרון של הגוף לא הופך אותך לשבור.\nהוא הופך אותך לאנושי.",
    en: "Your body's memory doesn't make you broken.\nIt makes you human.",
  },
  {
    he: "להתעורר היום\nכבר היה משהו.",
    en: "Waking up today\nwas already something.",
  },
  {
    he: "ההתאוששות לא קווית.\nאתה לא מאחר.",
    en: "Healing isn't linear.\nYou're not behind.",
  },
  {
    he: "אתה לא צריך להבין הכל עכשיו.\nרק להיות כאן.",
    en: "You don't need to understand everything now.\nJust be here.",
  },
  {
    he: "מה שעבר עליך אמיתי.\nמה שאתה מרגיש עכשיו זה לא חולשה.",
    en: "What you went through is real.\nWhat you feel now isn't weakness.",
  },
  {
    he: "הנשימה הזאת היא שלך.\nשום דבר לא ייקח אותה ממך.",
    en: "This breath is yours.\nNothing takes it from you.",
  },
  {
    he: "אתה לא לבד בזה.\nגם כשזה מרגיש ככה.",
    en: "You're not alone in this.\nEven when it feels that way.",
  },
  {
    he: "השקט אחרי הסערה הוא רגע.\nרגעים מצטברים.",
    en: "The quiet after a storm is a moment.\nMoments add up.",
  },
  {
    he: "להיות כאן היום\nזאת בחירה.",
    en: "Being here today\nis a choice.",
  },
  {
    he: "אין דרך נכונה\nלהרגיש בריא.",
    en: "There's no right way\nto feel well.",
  },
  {
    he: "אתה זכאי לזמן\nשאתה צריך.",
    en: "You're entitled to the time\nyou need.",
  },
  {
    he: "פעולה קטנה ביום\nהיא לא קטנה.",
    en: "A small daily action\nisn't small.",
  },
  {
    he: "המערכת שלך הייתה בכוננות.\nעכשיו אתה לומד אותה לסמוך שוב.",
    en: "Your system was on alert.\nNow you're teaching it to trust again.",
  },
  {
    he: "אתה לא הסיפור שאתה מספר על עצמך\nברגעים הקשים.",
    en: "You are not the story you tell yourself\nin the hardest moments.",
  },
];

/** Today's affirmation — same quote all day, rotates at local midnight.
 *
 *  Picks deterministically from DAILY_AFFIRMATIONS by hashing the local
 *  YYYY-MM-DD into an index. Two callers in the same day see the same
 *  quote; the next day rotates to a different one. */
export function getDailyAffirmation(lang: string): string {
  const today = new Date();
  // Local-date integer key: YYYY * 10000 + MM * 100 + DD. Mod by array
  // length to land in range. Day index is stable across re-renders within
  // the same calendar day.
  const dateKey =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  const idx = dateKey % DAILY_AFFIRMATIONS.length;
  return localize(DAILY_AFFIRMATIONS[idx], lang);
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
      en: "Your body has a built-in alarm. Racing heart, shallow breath, tense muscles — that's the amygdala doing its job. It kept you alive.",
      he: "לגוף שלך יש אזעקה מובנית. דופק מהיר, נשימה שטחית, שרירים דרוכים — זה המוח עושה את עבודתו. הוא שמר עליך.",
    },
    {
      en: "After the danger passes, the alarm stays sensitive. A sound, a smell, a place can still set it off. That's not broken — it's a protection system that adapted.",
      he: "אחרי שהסכנה חולפת, האזעקה נשארת רגישה. צליל, ריח או מקום עוד יכולים להפעיל אותה. זה לא קלקול — זאת מערכת הגנה שהתאימה את עצמה.",
    },
    {
      en: "Here, gradually and in a safe space, we'll teach the system that the danger has passed.",
      he: "כאן, בהדרגה ובמרחב בטוח, נלמד את המערכת שהסכנה חלפה.",
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
      en: "Five quick questions. We use them to suggest whether to pair the app with talking to someone. Your answers stay on this device.",
      // TODO(hirschman-review)
      he: "חמש שאלות קצרות. עוזרות לנו להציע אם כדאי לשלב את האפליקציה עם שיחה עם מישהו. התשובות נשארות במכשיר.",
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

// ── Companion tasks (v1 behavioral roadmap) ────────────────────────────────
//
// Per-scenario exposure/behavioral-activation ladders. Each scene has a
// short, ordered sequence of concrete steps a veteran can attempt in their
// day-to-day life — the "behavioral half" of HearO.
//
// Content status: all task labels below are placeholders drafted from the
// research-recommended evidence-based hierarchies for combat PTSD (social
// interaction, intimacy, agoraphobia-like avoidance, sleep, shared
// activities). ALL of these MUST be reviewed by Dr. Hirschman before real
// users see them — see docs/meeting-notes-2026-06-29.md and the deep-research
// report (2026-07-06) for the clinical rationale. Marked TODO(clinical-review)
// throughout.

export interface CompanionTask {
  key: string;
  label: LocalizedText;
}

const COMPANION_TASKS: Record<SceneKey, CompanionTask[]> = {
  // TODO(clinical-review): beach exposure ladder — social + open space
  beach: [
    { key: "beach-1", label: { en: "Walk to a beach access point and stand for 2 minutes", he: "לך לנקודת גישה לים ועמוד שם שתי דקות" } },
    { key: "beach-2", label: { en: "Sit on the sand for 10 minutes and listen", he: "שב על החול עשר דקות ופשוט הקשב" } },
    { key: "beach-3", label: { en: "Walk barefoot along the water for 5 minutes", he: "לך יחף לאורך המים חמש דקות" } },
    { key: "beach-4", label: { en: "Sit for 20 minutes and watch the people around you", he: "שב עשרים דקות והתבונן באנשים סביבך" } },
    { key: "beach-5", label: { en: "Come to the beach with someone you trust", he: "בוא לים עם מישהו שאתה סומך עליו" } },
  ],
  // TODO(clinical-review): park exposure ladder — crowds + unpredictable stimuli
  park: [
    { key: "park-1", label: { en: "Walk through the park in the early morning (quiet)", he: "לך דרך הפארק בשעות הבוקר המוקדמות" } },
    { key: "park-2", label: { en: "Sit on a bench for 10 minutes", he: "שב על ספסל עשר דקות" } },
    { key: "park-3", label: { en: "Walk through the park during regular hours", he: "לך דרך הפארק בשעות הרגילות" } },
    { key: "park-4", label: { en: "Sit near where children play for 5 minutes", he: "שב ליד גן שעשועים חמש דקות" } },
    { key: "park-5", label: { en: "Come with a family member", he: "בוא עם בן משפחה" } },
  ],
  // TODO(clinical-review): cafe exposure ladder — enclosed space + strangers
  cafe: [
    { key: "cafe-1", label: { en: "Order coffee at the counter and take it to go", he: "הזמן קפה בדלפק וקח לך" } },
    { key: "cafe-2", label: { en: "Order and stand inside for 5 minutes", he: "הזמן ותעמוד בפנים חמש דקות" } },
    { key: "cafe-3", label: { en: "Sit inside for 10 minutes alone", he: "שב בפנים לבד עשר דקות" } },
    { key: "cafe-4", label: { en: "Sit inside for 20 minutes with a friend", he: "שב בפנים עשרים דקות עם חבר" } },
    { key: "cafe-5", label: { en: "Meet someone here for a full breakfast", he: "קבע פגישה לארוחת בוקר שלמה" } },
  ],
  // TODO(clinical-review): road exposure ladder — traffic, sirens, movement
  road: [
    { key: "road-1", label: { en: "Walk 100 meters along the road", he: "לך מאה מטרים לאורך הכביש" } },
    { key: "road-2", label: { en: "Walk to the nearest bus stop and back", he: "לך לתחנת האוטובוס הקרובה וחזור" } },
    { key: "road-3", label: { en: "Take the bus one stop", he: "סע באוטובוס תחנה אחת" } },
    { key: "road-4", label: { en: "Take the bus a longer distance", he: "סע באוטובוס מרחק ארוך יותר" } },
    { key: "road-5", label: { en: "Drive a short distance", he: "נהג מרחק קצר" } },
  ],
  // TODO(clinical-review): train exposure ladder — enclosed, cannot easily leave
  train: [
    { key: "train-1", label: { en: "Walk into the station and buy a ticket", he: "היכנס לתחנה וקנה כרטיס" } },
    { key: "train-2", label: { en: "Stand on the platform for 10 minutes", he: "עמוד על הרציף עשר דקות" } },
    { key: "train-3", label: { en: "Ride one stop and get off", he: "סע תחנה אחת וירד" } },
    { key: "train-4", label: { en: "Ride a longer distance during regular hours", he: "סע מרחק ארוך בשעות הרגילות" } },
    { key: "train-5", label: { en: "Take a full trip with someone you trust", he: "עשה נסיעה מלאה עם מישהו שאתה סומך עליו" } },
  ],
  // TODO(clinical-review): quiet-bar exposure ladder — social + evening lighting
  "quiet-bar": [
    { key: "quiet-bar-1", label: { en: "Walk past the bar and look inside", he: "עבור ליד הבר והסתכל פנימה" } },
    { key: "quiet-bar-2", label: { en: "Go in and sit at the bar for 10 minutes", he: "היכנס ושב בבר עשר דקות" } },
    { key: "quiet-bar-3", label: { en: "Order a drink and stay for 20 minutes", he: "הזמן משקה ותישאר עשרים דקות" } },
    { key: "quiet-bar-4", label: { en: "Meet a friend here for an hour", he: "קבע פגישה כאן עם חבר לשעה" } },
    { key: "quiet-bar-5", label: { en: "Come with a small group in the evening", he: "בוא עם קבוצה קטנה בשעות הערב" } },
  ],
  // TODO(clinical-review): house-party exposure ladder — dense social exposure
  "house-party": [
    { key: "house-party-1", label: { en: "Say yes to an invitation and arrive briefly", he: "אמור כן להזמנה והגע לזמן קצר" } },
    { key: "house-party-2", label: { en: "Stay for 30 minutes and talk to one person", he: "השאר חצי שעה ודבר עם אדם אחד" } },
    { key: "house-party-3", label: { en: "Stay for an hour and talk to a few people", he: "השאר שעה ודבר עם כמה אנשים" } },
    { key: "house-party-4", label: { en: "Stay through the busy part of the evening", he: "השאר בשעות העמוסות של הערב" } },
    { key: "house-party-5", label: { en: "Host a small gathering yourself", he: "ארח בעצמך התכנסות קטנה" } },
  ],
  // TODO(clinical-review): supermarket exposure ladder — announcements, crowds
  supermarket: [
    { key: "supermarket-1", label: { en: "Walk through and buy one item", he: "עבור בסופר וקנה פריט אחד" } },
    { key: "supermarket-2", label: { en: "Do a short shop during quiet hours", he: "עשה קנייה קצרה בשעות שקטות" } },
    { key: "supermarket-3", label: { en: "Shop during regular hours", he: "עשה קניות בשעות הרגילות" } },
    { key: "supermarket-4", label: { en: "Shop when the store is busy", he: "עשה קניות כשהסופר עמוס" } },
    { key: "supermarket-5", label: { en: "Do the family shopping on a weekend", he: "עשה את קניות המשפחה בסוף השבוע" } },
  ],
  // TODO(clinical-review): bus exposure ladder — enclosed, unpredictable
  bus: [
    { key: "bus-1", label: { en: "Walk to a bus stop and wait 5 minutes", he: "לך לתחנת אוטובוס וחכה חמש דקות" } },
    { key: "bus-2", label: { en: "Board and ride one stop", he: "עלה ותסע תחנה אחת" } },
    { key: "bus-3", label: { en: "Ride during quiet hours for a longer route", he: "סע בשעות שקטות לקו ארוך יותר" } },
    { key: "bus-4", label: { en: "Ride during rush hour for one stop", he: "סע בשעות עומס תחנה אחת" } },
    { key: "bus-5", label: { en: "Take a full route during rush hour", he: "עשה קו שלם בשעות העומס" } },
  ],
};

export function getCompanionTasks(scene: SceneKey): CompanionTask[] {
  // COMPANION_TASKS is Record<SceneKey, ...>, so the key is guaranteed
  // present at compile time — no runtime fallback needed.
  return COMPANION_TASKS[scene];
}
