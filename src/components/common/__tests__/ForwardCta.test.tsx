import { render, screen, fireEvent } from "@testing-library/react-native";

// Mirrors ScreenHeader.test.tsx / CrisisAffordance.test.tsx — the SVG asset
// mock needs to forward props as a plain View for RNTL queries to work.
jest.mock("../../../../test/assetMock.js", () => {
  const { View } = require("react-native");
  function MockIcon(props: object) {
    return <View testID="icon-svg" {...props} />;
  }
  return MockIcon;
});

import { ForwardCta } from "../ForwardCta";

// ForwardCta is the shared Begin/Continue/Ready style, previously hand-rolled per screen.
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

  // Guards the writing-direction-relative value; jsdom can't apply RTL
  // mirroring, so the physical side is device-verified, not asserted here.
  it("uses alignSelf flex-end so RTL mirroring pins it correctly", () => {
    render(<ForwardCta label="Begin" onPress={() => {}} />);
    expect(screen.getByRole("button")).toHaveStyle({ alignSelf: "flex-end" });
  });
});
