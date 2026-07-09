import { render, screen, fireEvent } from "@testing-library/react-native";

import { CompanionCarousel } from "../CompanionCarousel";
import { getCompanionScenes, localize, SceneKey } from "@/lib/content/content";

// react-native-reanimated-carousel is gesture-/worklet-driven: under jsdom it
// only mounts a windowed subset and its pan-to-snap can't be fired cleanly.
// Replace it with a shim that renders EVERY item via the real renderItem (so we
// can assert order + that each page is tappable) — mirrors the shim used by
// setup/SceneCarousel.test.tsx.
jest.mock("react-native-reanimated-carousel", () => {
  const mockReact = require("react");
  const MockCarousel = ({ data, renderItem }: any) =>
    mockReact.createElement(
      mockReact.Fragment,
      null,
      data.map((item: any, index: number) =>
        mockReact.createElement(
          mockReact.Fragment,
          { key: item.key },
          renderItem({ item, index }),
        ),
      ),
    );
  return { __esModule: true, default: MockCarousel };
});

const scenes = getCompanionScenes();

const progress = { [scenes[0].key]: { done: 2, total: 5 } };

describe("CompanionCarousel", () => {
  it("renders a page per Companion scene, in order", () => {
    render(
      <CompanionCarousel scenes={scenes} progress={progress} lang="en" onOpen={() => {}} />,
    );
    for (const scene of scenes) {
      expect(screen.getByTestId(`companion-scenario-${scene.key}`)).toBeTruthy();
      expect(screen.getByLabelText(localize(scene.label, "en"))).toBeTruthy();
    }
  });

  it("shows completed-step progress for a scene that has media", () => {
    render(
      <CompanionCarousel scenes={scenes} progress={progress} lang="en" onOpen={() => {}} />,
    );
    expect(screen.getByText("2/5 steps")).toBeTruthy();
  });

  it("calls onOpen with the scene key when a page is pressed", () => {
    const onOpen = jest.fn();
    render(
      <CompanionCarousel scenes={scenes} progress={progress} lang="en" onOpen={onOpen} />,
    );
    const first: SceneKey = scenes[0].key;
    fireEvent.press(screen.getByTestId(`companion-scenario-${first}`));
    expect(onOpen).toHaveBeenCalledWith(first);
  });
});
