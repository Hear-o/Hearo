// Override the global no-op useFocusEffect mock from test/setup.ts so
// FadeScreen's real focus-triggered fade runs under test.
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = jest.requireActual("react");
    React.useEffect(() => cb(), [cb]);
  },
}));

import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { FadeScreen } from "../FadeScreen";

describe("FadeScreen", () => {
  it("renders its children", () => {
    render(
      <FadeScreen>
        <Text>content</Text>
      </FadeScreen>,
    );
    expect(screen.getByText("content")).toBeTruthy();
  });
});
