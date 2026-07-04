import { useCrisisStore, CRISIS_NUMBER } from "@/lib/storage/crisis-store";

// Tier 1 — safety-critical. Wrong state here = a veteran in crisis can't reach
// help. The hard-coded number is a regression tripwire on purpose.
describe("crisis-store", () => {
  beforeEach(() => {
    useCrisisStore.setState({ isOpen: false });
  });

  it("exposes the ERAN hotline number 1201", () => {
    expect(CRISIS_NUMBER).toBe("1201");
  });

  it("open() opens the sheet", () => {
    useCrisisStore.getState().open();
    expect(useCrisisStore.getState().isOpen).toBe(true);
  });

  it("close() closes the sheet", () => {
    useCrisisStore.setState({ isOpen: true });
    useCrisisStore.getState().close();
    expect(useCrisisStore.getState().isOpen).toBe(false);
  });
});
