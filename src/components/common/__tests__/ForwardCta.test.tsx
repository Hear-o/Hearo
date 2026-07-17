import { render, screen, fireEvent } from "@testing-library/react-native";

// Mirrors ScreenHeader.test.tsx / CrisisAffordance.test.tsx — the SVG asset
// mock needs to forward props as a plain View for RNTL queries to work.
jest.mock("../../../../test/assetMock.js", () => {
  const { View } = require("react-native");
  return (props: object) => <View testID="icon-svg" {...props} />;
});

import { ForwardCta } from "../ForwardCta";

// ForwardCta is the single source of truth for the Begin/Continue/Ready
// style — those three screens used to hand-roll the same label+arrow row
// with drifting text size and lineHeight. The contract: it renders the
// label, presses call onPress, and `disabled` blocks the press (covers
// setup's "no sound picked yet" state) while staying reachable to a11y.
describe("ForwardCta", () => {
  it("renders the label and calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(<ForwardCta label="Begin" onPress={onPress} />);
    fireEvent.press(screen.getByText("Begin"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("exposes a labelled button to assistive tech", () => {
    render(<ForwardCta label="Continue" onPress={() => {}} />);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("blocks the press when disabled", () => {
    const onPress = jest.fn();
    render(<ForwardCta label="Ready" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText("Ready"));
    expect(onPress).not.toHaveBeenCalled();
  });

  // Screen position is `alignSelf: "flex-end"`, unconditionally. Under the
  // app's native RTL (forceRTL=true, makeRTLFlipLeftAndRightStyles=false —
  // see plugins/withRtl.js) Yoga mirrors flex alignment, so flex-end pins
  // physical right in English and physical left in Hebrew from one value,
  // no isRTL branch. IMPORTANT: this asserts the literal style only. jsdom
  // does NOT apply Yoga's RTL mirroring, so no jest test can prove the
  // physical left/right result — that is device-verified (npx expo run:ios).
  // The guard here is that the value stays writing-direction-relative and
  // never regresses to a hard-coded left/right or an inverted isRTL branch.
  it("uses alignSelf flex-end so RTL mirroring pins it correctly", () => {
    render(<ForwardCta label="Begin" onPress={() => {}} />);
    expect(screen.getByRole("button")).toHaveStyle({ alignSelf: "flex-end" });
  });
});
