// Tiny zustand store that drives the SettingsSheet overlay.
//
// Modeled on crisis-store: ephemeral open/close state, no persistence. The
// sheet is rendered globally in _layout.tsx and any screen can open it by
// calling useSettingsSheetStore.getState().open() — the gear icon on Home
// is the canonical entry, but the same store works from anywhere if we add
// more entry points later.

import { create } from "zustand";

interface SettingsSheetState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useSettingsSheetStore = create<SettingsSheetState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
