// Pure-function helpers that derive a time-of-day band from the device clock
// and the matching default scene. Recomputed on render — no caching needed,
// `Date.now()` is cheap.
//
// Bands chosen for the typical waking day rather than astronomical accuracy:
//   05:00–11:59  → morning
//   12:00–17:59  → afternoon
//   18:00–22:59  → evening
//   23:00–04:59  → night

import type { SceneKey } from "@/lib/content/content";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export function getTimeOfDay(now: Date = new Date()): TimeOfDay {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night"; // 23:00–04:59
}

const SCENE_BY_BAND: Record<TimeOfDay, SceneKey> = {
  morning: "cafe",
  afternoon: "park",
  evening: "beach",
  night: "road",
};

export function getDefaultSceneForTimeOfDay(now?: Date): SceneKey {
  return SCENE_BY_BAND[getTimeOfDay(now)];
}
