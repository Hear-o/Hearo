import { create } from "zustand";

import { getDefaultPreferences, getScene, SceneKey, SoundKey } from "@/lib/content/content";

export type { SceneKey, SoundKey };

/** How the most recent session ended. `null` means no session has ended in
 *  this app session (cleared on app restart — sessions aren't persisted yet).
 *  The seam exists today so the calming-protocol exit can be distinguished
 *  from natural/manual exits. When session telemetry lands, this becomes one
 *  row in a session-records table. */
export type SessionEndedBy = "natural" | "manual-exit" | "calming-protocol";

/** Total session length in minutes. 3/5/7 are the only valid choices today —
 *  picked at Setup, scaled proportionally across AMBIENT_FADE_IN + ADAPTIVE_LOOP.
 *  See session.tsx for the split math. */
export type SessionDurationMinutes = 3 | 5 | 7;

/** Default length when the user lands at Setup without picking. 5 was chosen
 *  as the middle option — long enough for baseline lock-in + meaningful
 *  exposure, short enough not to feel like a commitment. */
const DEFAULT_DURATION_MINUTES: SessionDurationMinutes = 5;

type SessionState = {
  scene: SceneKey;
  sounds: SoundKey[];
  durationMinutes: SessionDurationMinutes;
  lastEndedBy: SessionEndedBy | null;
  setScene: (scene: SceneKey) => void;
  toggleSound: (sound: SoundKey) => void;
  setDurationMinutes: (minutes: SessionDurationMinutes) => void;
  setLastEndedBy: (endedBy: SessionEndedBy) => void;
};

const defaults = getDefaultPreferences();

export const useSessionStore = create<SessionState>((set) => ({
  scene: defaults.scene,
  sounds: defaults.sounds,
  durationMinutes: DEFAULT_DURATION_MINUTES,
  lastEndedBy: null,
  // v1.1.x: when the scene changes, drop any selected sounds that no longer
  // fit the new scene's triggerCandidates list. Keeps Setup's selection in
  // sync with the visible picker — otherwise a user could carry over (say) a
  // helicopter from the road scene into the cafe scene without seeing it.
  setScene: (scene) =>
    set((state) => {
      const allowed = new Set(getScene(scene).triggerCandidates);
      return {
        scene,
        sounds: state.sounds.filter((s) => allowed.has(s)),
      };
    }),
  toggleSound: (sound) =>
    set((state) => ({
      sounds: state.sounds.includes(sound)
        ? state.sounds.filter((s) => s !== sound)
        : [...state.sounds, sound],
    })),
  setDurationMinutes: (minutes) => set({ durationMinutes: minutes }),
  setLastEndedBy: (endedBy) => set({ lastEndedBy: endedBy }),
}));
