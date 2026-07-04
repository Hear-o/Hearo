import { create } from "zustand";

// Intentionally hard-coded: this is region configuration (Israel's ERAN line),
// not enriched content. Not an API concern. If the app ever ships to another
// region, this becomes a build-time/region config value, not a backend fetch.
export const CRISIS_NUMBER = "1201";

type CrisisState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useCrisisStore = create<CrisisState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
