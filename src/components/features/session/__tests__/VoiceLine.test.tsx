import { render, screen } from "@testing-library/react-native";

import { VoiceLine } from "../VoiceLine";

// Tier 3 — smoke. VoiceLine is the spoken-word line on screen during a session.
// It's animation-driven (reanimated fade/slide), so the contract that matters is
// simply: it renders the exact text it's given, without throwing, including the
// empty-string branch. Animations are synchronous no-ops under the test setup.
describe("VoiceLine", () => {
  it("renders the line it is given", () => {
    const line = "A quiet place\nto walk again.";
    render(<VoiceLine text={line} />);
    expect(screen.getByText(line)).toBeTruthy();
  });

  it("renders without throwing for empty text", () => {
    expect(() => render(<VoiceLine text="" />)).not.toThrow();
  });

  it("renders a different line when the text prop changes", () => {
    const { rerender } = render(<VoiceLine text="Breathe in" />);
    expect(screen.getByText("Breathe in")).toBeTruthy();

    rerender(<VoiceLine text="Breathe out" />);
    expect(screen.getByText("Breathe out")).toBeTruthy();
    expect(screen.queryByText("Breathe in")).toBeNull();
  });
});
