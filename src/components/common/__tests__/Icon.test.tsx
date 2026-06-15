import { render, screen } from "@testing-library/react-native";
import type { ReactTestRendererJSON } from "react-test-renderer";

import { Icon, type IconName } from "../Icon";

// Tier 3 — smoke. Icon is the shared glyph primitive behind nav/close/arrows.
// The global moduleNameMapper collapses every `*.svg` import onto a single
// stub module (test/assetMock.js exporting the number 1), so the three svgs
// Icon imports are indistinguishable by source path at test time. We re-mock
// that one stub as a prop-forwarding View and assert on the parts that ARE
// observable: that every IconName renders without throwing, that the svg
// receives size/color, and that arrow-left (vs arrow-right) flips the wrapper.
jest.mock("../../../../test/assetMock.js", () => {
  const { View } = require("react-native");
  return (props: object) => <View testID="icon-svg" {...props} />;
});

// The rendered host tree is [wrapper View] (root) > [svg View]. Reading via
// toJSON() gives the clean host element so we can inspect the wrapper's style
// (the flip transform lives here) and the svg's forwarded props.
function tree(json: ReactTestRendererJSON | ReactTestRendererJSON[] | null) {
  const wrapper = (Array.isArray(json) ? json[0] : json) as ReactTestRendererJSON;
  const svg = (wrapper.children as ReactTestRendererJSON[])[0];
  return {
    wrapperStyle: wrapper.props.style as Record<string, unknown>,
    svgProps: svg.props as { width: number; height: number; color: string },
  };
}

describe("Icon", () => {
  const names: IconName[] = ["close", "menu", "info", "arrow-right", "arrow-left"];

  it.each(names)("renders %s without throwing", (name) => {
    expect(() => render(<Icon name={name} />)).not.toThrow();
    // One svg element per icon, every name branch reachable.
    expect(screen.getByTestId("icon-svg")).toBeTruthy();
  });

  it("applies a horizontal flip (scaleX: -1) on the arrow-left wrapper", () => {
    const { wrapperStyle } = tree(render(<Icon name="arrow-left" />).toJSON());
    expect(wrapperStyle.transform).toEqual([{ scaleX: -1 }]);
  });

  it("does NOT flip the arrow-right wrapper (non-flipped branch)", () => {
    // arrow-left reuses this same right-arrow svg; only the wrapper differs.
    const { wrapperStyle } = tree(render(<Icon name="arrow-right" />).toJSON());
    expect(wrapperStyle.transform).toBeUndefined();
  });

  it("does not flip non-arrow icons either", () => {
    const { wrapperStyle } = tree(render(<Icon name="close" />).toJSON());
    expect(wrapperStyle.transform).toBeUndefined();
  });

  it("forwards size to both the wrapper box and the svg", () => {
    const { wrapperStyle, svgProps } = tree(
      render(<Icon name="close" size={40} />).toJSON(),
    );
    expect(svgProps.width).toBe(40);
    expect(svgProps.height).toBe(40);
    expect(wrapperStyle.width).toBe(40);
    expect(wrapperStyle.height).toBe(40);
  });

  it("defaults size to 22 when omitted", () => {
    const { svgProps } = tree(render(<Icon name="menu" />).toJSON());
    expect(svgProps.width).toBe(22);
  });

  it("forwards an explicit color to the svg", () => {
    const { svgProps } = tree(
      render(<Icon name="menu" color="#abcdef" />).toJSON(),
    );
    expect(svgProps.color).toBe("#abcdef");
  });

  it("defaults color to currentColor when omitted", () => {
    const { svgProps } = tree(render(<Icon name="menu" />).toJSON());
    expect(svgProps.color).toBe("currentColor");
  });
});
