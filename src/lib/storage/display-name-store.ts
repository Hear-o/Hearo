import { create } from "zustand";

// In-memory mirror of the persisted display name (AsyncStorage remains the
// source of truth across app restarts — see displayName.ts's
// resolveDisplayName/persistDisplayName). Every consumer (Home's greeting,
// Permissions' and Settings' name fields) subscribes to this store instead
// of polling storage independently, so a save from any one of them is
// reflected everywhere instantly — no route-focus event or app restart
// required.
interface DisplayNameState {
  name: string | null;
  loading: boolean;
  setName: (name: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useDisplayNameStore = create<DisplayNameState>((set) => ({
  name: null,
  loading: true,
  setName: (name) => set({ name }),
  setLoading: (loading) => set({ loading }),
}));
