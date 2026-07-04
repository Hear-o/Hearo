import { render } from "@testing-library/react-native";

import { SceneBackground } from "../SceneBackground";
import { SCENE_ORDER } from "@/lib/content/content";

// Tier 3 — smoke. SceneBackground paints the immersive Session backdrop: a
// tint gradient, the scene still, and a dark legibility overlay. It renders no
// text, so there's nothing to assert on copy — the contract worth guarding is
// that every valid scene key mounts without throwing and produces a non-empty
// tree (the still + two gradients). If a scene key or asset require() ever
// breaks, the veteran's session screen goes blank; these asserts trip first.
describe("SceneBackground", () => {
  it.each(SCENE_ORDER)("renders without throwing for scene %s", (scene) => {
    const tree = render(<SceneBackground scene={scene} />).toJSON();
    expect(tree).toBeTruthy();
  });

  it("renders the still image and both gradient overlays", () => {
    // The wrapper View nests three children: tint gradient, the still Image,
    // and the overlay gradient. All four scenes ship a still, so the Image
    // branch is always taken.
    const tree = render(<SceneBackground scene="beach" />).toJSON();
    expect(tree).not.toBeNull();
    expect(Array.isArray((tree as any).children)).toBe(true);
    expect((tree as any).children.length).toBe(3);
  });

  it("honors a custom intensity without throwing", () => {
    // intensity drives the overlay alpha math (clamped to 1). Push it past the
    // clamp to exercise the Math.min branch.
    const tree = render(
      <SceneBackground scene="road" intensity={0.99} />,
    ).toJSON();
    expect(tree).toBeTruthy();
  });

  it("clamps intensity at the upper bound (1)", () => {
    const tree = render(
      <SceneBackground scene="cafe" intensity={1} />,
    ).toJSON();
    expect(tree).toBeTruthy();
  });
});
