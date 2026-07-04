import { useSettingsSheetStore } from "@/lib/storage/settings-sheet-store";

describe("useSettingsSheetStore", () => {
  beforeEach(() => {
    useSettingsSheetStore.setState({ isOpen: false });
  });

  it("starts closed", () => {
    expect(useSettingsSheetStore.getState().isOpen).toBe(false);
  });

  it("open() flips isOpen to true", () => {
    useSettingsSheetStore.getState().open();
    expect(useSettingsSheetStore.getState().isOpen).toBe(true);
  });

  it("close() flips isOpen back to false", () => {
    useSettingsSheetStore.getState().open();
    useSettingsSheetStore.getState().close();
    expect(useSettingsSheetStore.getState().isOpen).toBe(false);
  });
});
