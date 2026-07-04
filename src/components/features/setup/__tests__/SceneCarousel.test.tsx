import { render, screen, fireEvent } from "@testing-library/react-native";

import { SceneCarousel } from "../SceneCarousel";
import { SCENE_ORDER, getScene, localize } from "@/lib/content/content";

// react-native-reanimated-carousel is gesture- and worklet-driven: under jsdom
// it only mounts a windowed subset of items and its pan-to-snap selection can't
// be fired cleanly. Replace it with a minimal shim that renders EVERY item via
// the real renderItem (so we can assert order + copy) and exposes one Pressable
// per item that calls onSnapToItem(index) — the deterministic stand-in for the
// swipe that drives selection in production.
jest.mock("react-native-reanimated-carousel", () => {
  const mockReact = require("react");
  const mockRN = require("react-native");
  const MockCarousel = ({ data, renderItem, onSnapToItem }: any) =>
    mockReact.createElement(
      mockReact.Fragment,
      null,
      data.map((item: any, index: number) =>
        mockReact.createElement(
          mockRN.Pressable,
          {
            key: item.key,
            testID: `scene-${item.key}`,
            onPress: () => onSnapToItem(index),
          },
          renderItem({ item, index }),
        ),
      ),
    );
  return { __esModule: true, default: MockCarousel };
});

// Tier 2 — onboarding. SceneCarousel is how a veteran picks the world they'll
// walk through; if scenes drop out, reorder, or selection stops reporting, the
// setup flow silently breaks. These asserts pin the SCENE_ORDER contract, the
// EN labels, and the onChange callback that records the choice.
describe("SceneCarousel", () => {
  const noop = () => {};

  it("renders every scene's EN label in SCENE_ORDER", () => {
    render(<SceneCarousel value="beach" onChange={noop} lang="en" />);

    for (const key of SCENE_ORDER) {
      const label = localize(getScene(key).label, "en");
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("renders the scene cards in the SCENE_ORDER sequence", () => {
    render(<SceneCarousel value="beach" onChange={noop} lang="en" />);

    // The mock keys each card wrapper as scene-<key>; their document order must
    // match SCENE_ORDER (beach, park, cafe, road).
    const renderedKeys = SCENE_ORDER.map((key) =>
      screen.getByTestId(`scene-${key}`),
    );
    expect(renderedKeys).toHaveLength(SCENE_ORDER.length);
    expect(SCENE_ORDER).toEqual(["beach", "park", "cafe", "road"]);
  });

  it("fires onChange with the scene key when an item is snapped to", () => {
    const onChange = jest.fn();
    render(<SceneCarousel value="beach" onChange={onChange} lang="en" />);

    fireEvent.press(screen.getByTestId("scene-cafe"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("cafe");
  });

  it("reports the matching key for each scene position", () => {
    const onChange = jest.fn();
    render(<SceneCarousel value="beach" onChange={onChange} lang="en" />);

    for (const key of SCENE_ORDER) {
      fireEvent.press(screen.getByTestId(`scene-${key}`));
    }

    expect(onChange.mock.calls.map((c) => c[0])).toEqual(SCENE_ORDER);
  });
});
