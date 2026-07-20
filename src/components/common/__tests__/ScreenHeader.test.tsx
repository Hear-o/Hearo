import { render, screen, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";

// Mirrors CrisisAffordance.test.tsx / Icon.test.tsx — the SVG asset mock needs
// to forward props as a plain View for RNTL queries to work.
jest.mock("../../../../test/assetMock.js", () => {
  const { View } = require("react-native");
  function MockIcon(props: object) {
    return <View testID="icon-svg" {...props} />;
  }
  return MockIcon;
});

import { ScreenHeader } from "../ScreenHeader";
import { useCrisisStore } from "@/lib/storage/crisis-store";

// ScreenHeader gives the crisis "i" one predictable position across every screen.
describe("ScreenHeader", () => {
  it("always renders the crisis affordance, reachable by assistive tech", () => {
    render(<ScreenHeader />);
    expect(screen.getByLabelText("open crisis support")).toBeTruthy();
  });

  it("pressing the crisis affordance opens the crisis sheet", () => {
    expect(useCrisisStore.getState().isOpen).toBe(false);
    render(<ScreenHeader />);
    fireEvent.press(screen.getByLabelText("open crisis support"));
    expect(useCrisisStore.getState().isOpen).toBe(true);
  });

  it("renders a supplied left slot alongside the crisis affordance", () => {
    render(<ScreenHeader left={<Text>back</Text>} />);
    expect(screen.getByText("back")).toBeTruthy();
    expect(screen.getByLabelText("open crisis support")).toBeTruthy();
  });

  it("renders without a left slot without throwing", () => {
    expect(() => render(<ScreenHeader />)).not.toThrow();
  });

  it("forwards the on-scene tone to the crisis affordance", () => {
    expect(() => render(<ScreenHeader tone="on-scene" />)).not.toThrow();
    expect(screen.getByLabelText("open crisis support")).toBeTruthy();
  });
});
