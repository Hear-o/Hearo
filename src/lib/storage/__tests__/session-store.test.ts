import { useSessionStore } from "@/lib/storage/session-store";
import { getDefaultPreferences } from "@/lib/content/content";

describe("session-store", () => {
  // Capture defaults inside beforeEach. getDefaultPreferences() depends on the
  // current time band; if we cache it at module load we get flakiness when a
  // test run straddles a band boundary (midnight/5am/noon/6pm).
  let defaults: ReturnType<typeof getDefaultPreferences>;

  beforeEach(() => {
    defaults = getDefaultPreferences();
    useSessionStore.setState({
      scene: defaults.scene,
      sounds: defaults.sounds,
      durationMinutes: 5,
      lastEndedBy: null,
    });
  });

  it("initializes from default preferences", () => {
    const s = useSessionStore.getState();
    expect(s.scene).toBe(defaults.scene);
    expect(s.sounds).toEqual(defaults.sounds);
  });

  it("setScene replaces the selected scene", () => {
    useSessionStore.getState().setScene("beach");
    expect(useSessionStore.getState().scene).toBe("beach");
  });

  it("toggleSound adds a sound when it is absent", () => {
    useSessionStore.setState({ sounds: [] });
    useSessionStore.getState().toggleSound("siren");
    expect(useSessionStore.getState().sounds).toContain("siren");
  });

  it("toggleSound removes a sound when it is already present", () => {
    useSessionStore.setState({ sounds: ["siren"] });
    useSessionStore.getState().toggleSound("siren");
    expect(useSessionStore.getState().sounds).not.toContain("siren");
  });

  it("toggleSound leaves other selected sounds untouched", () => {
    useSessionStore.setState({ sounds: ["siren", "motorcycle"] });
    useSessionStore.getState().toggleSound("siren");
    expect(useSessionStore.getState().sounds).toEqual(["motorcycle"]);
  });

  describe("durationMinutes", () => {
    it("defaults to 5 minutes (middle of 3/5/7)", () => {
      expect(useSessionStore.getState().durationMinutes).toBe(5);
    });

    it("setDurationMinutes updates the value", () => {
      useSessionStore.getState().setDurationMinutes(7);
      expect(useSessionStore.getState().durationMinutes).toBe(7);

      useSessionStore.getState().setDurationMinutes(3);
      expect(useSessionStore.getState().durationMinutes).toBe(3);
    });
  });

  // B-03: telemetry seam for session-end pathway distinction. Today this
  // doesn't surface in the After screen; it's the contract for future
  // analytics + the calming-protocol exit can be detected from `null`.
  describe("lastEndedBy", () => {
    it("defaults to null (no session has ended in this app session)", () => {
      expect(useSessionStore.getState().lastEndedBy).toBeNull();
    });

    it("setLastEndedBy persists the value", () => {
      useSessionStore.getState().setLastEndedBy("calming-protocol");
      expect(useSessionStore.getState().lastEndedBy).toBe("calming-protocol");
    });

    it("setLastEndedBy overwrites prior value", () => {
      useSessionStore.getState().setLastEndedBy("natural");
      useSessionStore.getState().setLastEndedBy("manual-exit");
      expect(useSessionStore.getState().lastEndedBy).toBe("manual-exit");
    });
  });
});
