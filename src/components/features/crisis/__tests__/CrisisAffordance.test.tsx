import { render, screen, fireEvent } from "@testing-library/react-native";

// The asset mapper maps every *.svg to assetMock.js (which exports the number 1
// for image-asset use). The SVG path goes through the Icon component now, which
// renders the imported module as a React component — so for this test we need
// assetMock to be a prop-forwarding View instead. Mirrors Icon.test.tsx.
jest.mock("../../../../../test/assetMock.js", () => {
  const { View } = require("react-native");
  return (props: object) => <View testID="icon-svg" {...props} />;
});

import { CrisisAffordance } from "../CrisisAffordance";
import { useCrisisStore } from "@/lib/storage/crisis-store";

// Tier 1 — safety-critical. This little "i" is the one-tap path a veteran in
// crisis uses to reach the support sheet. The contract that matters: pressing it
// drives the store to isOpen=true, it stays renderable on both background tones,
// and it stays reachable to assistive tech (button role + a clear label).
describe("CrisisAffordance", () => {
  it("pressing the affordance opens the crisis sheet", () => {
    // Setup resets the store after each test, so it starts closed.
    expect(useCrisisStore.getState().isOpen).toBe(false);

    render(<CrisisAffordance />);
    fireEvent.press(screen.getByRole("button"));

    expect(useCrisisStore.getState().isOpen).toBe(true);
  });

  it("renders the default on-bg tone without throwing", () => {
    expect(() => render(<CrisisAffordance />)).not.toThrow();
    // The labelled button is the safety contract; the visual is an SVG icon
    // now, not a Text glyph, so we assert role + label instead of inner text.
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("renders the on-scene tone without throwing", () => {
    expect(() => render(<CrisisAffordance tone="on-scene" />)).not.toThrow();
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("exposes a labelled button to assistive tech", () => {
    render(<CrisisAffordance />);
    const button = screen.getByRole("button");
    expect(button).toBeTruthy();
    expect(screen.getByLabelText("open crisis support")).toBeTruthy();
  });
});
