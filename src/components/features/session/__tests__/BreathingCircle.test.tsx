import { render, screen } from "@testing-library/react-native";

import { BreathingCircle } from "../BreathingCircle";

// Tier 3 — smoke. BreathingCircle is the calming focal point of a session; if it
// throws or shows the wrong guidance copy a veteran loses the one anchor on the
// screen. Reanimated is mocked synchronously in test/setup.ts, so we can't time
// the breathing cycle — instead we assert the initial render and the
// prop-driven branches (flash / slow / paused) that are reachable without
// animation timing. i18n is pinned to English in setup.
describe("BreathingCircle", () => {
  it("renders without throwing and shows the initial 'Breathe in' guidance", () => {
    render(<BreathingCircle />);
    // The first phase is "in" before any timer fires.
    expect(screen.getByText("Breathe in")).toBeTruthy();
  });

  it("renders with the default props (no flash, not slow, not paused)", () => {
    expect(() => render(<BreathingCircle />)).not.toThrow();
    expect(screen.getByText("Breathe in")).toBeTruthy();
  });

  it("renders with a flash pulse without throwing", () => {
    // flash > 0 drives the trigger-flash branch in the flashOpacity effect.
    expect(() => render(<BreathingCircle flash={0.8} />)).not.toThrow();
    expect(screen.getByText("Breathe in")).toBeTruthy();
  });

  it("renders in the slowed (auto-soften) cycle without throwing", () => {
    expect(() => render(<BreathingCircle slow />)).not.toThrow();
    expect(screen.getByText("Breathe in")).toBeTruthy();
  });

  it("renders while paused without throwing and still shows 'Breathe in'", () => {
    // paused cancels the scale animation and skips the phase scheduler, so the
    // initial "in" phase stays put.
    expect(() => render(<BreathingCircle paused />)).not.toThrow();
    expect(screen.getByText("Breathe in")).toBeTruthy();
  });

  it("does not render the opposite-phase copy on first paint", () => {
    render(<BreathingCircle />);
    // Only one label is shown at a time; "Breathe out" is the other phase.
    expect(screen.queryByText("Breathe out")).toBeNull();
  });
});
