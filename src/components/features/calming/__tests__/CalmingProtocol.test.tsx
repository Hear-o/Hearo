import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";

// Mirrors Icon.test.tsx / ForwardCta.test.tsx — the step-nav arrows render
// through Icon, whose svg imports collapse onto the shared asset stub. Forward
// them as a plain View so the arrows mount.
jest.mock("../../../../../test/assetMock.js", () => {
  const { View } = require("react-native");
  function MockIcon(props: object) {
    return <View testID="icon-svg" {...props} />;
  }
  return MockIcon;
});

import { CalmingProtocol } from "@/components/features/calming/CalmingProtocol";
import type { CalmingProtocolStep } from "@/lib/content/content";

// Each step is a few-ms duration so the protocol completes in ~50ms total —
// fast enough to use real timers. Fake-timer chaining across React re-renders
// stalls (see commit notes), so real timers + waitFor is the cleaner pattern
// for orchestrators that re-mount their content per step.

// 150ms per step is enough that waitFor's ~50ms polling catches each
// transition. The real protocol uses 10–22s per prose step.
const SHORT_STEPS: CalmingProtocolStep[] = [
  {
    kind: "validation",
    text: { en: "Step one.", he: "צעד אחד." },
    durationMs: 150,
  },
  {
    kind: "body-grounding",
    text: { en: "Step two.", he: "צעד שתיים." },
    durationMs: 150,
  },
  {
    kind: "close",
    text: { en: "Step three.", he: "צעד שלוש." },
    durationMs: 150,
  },
];

describe("CalmingProtocol", () => {
  it("renders the first step on mount", () => {
    render(<CalmingProtocol onProtocolEnd={() => {}} steps={SHORT_STEPS} />);
    expect(screen.getByText("Step one.")).toBeTruthy();
  });

  it("advances through each prose step when its timer elapses", async () => {
    render(<CalmingProtocol onProtocolEnd={() => {}} steps={SHORT_STEPS} />);
    expect(screen.getByText("Step one.")).toBeTruthy();

    await waitFor(() => expect(screen.getByText("Step two.")).toBeTruthy(), { timeout: 500 });
    await waitFor(() => expect(screen.getByText("Step three.")).toBeTruthy(), { timeout: 500 });
  });

  it("invokes onProtocolEnd exactly once after the final step's duration", async () => {
    const onProtocolEnd = jest.fn();
    render(<CalmingProtocol onProtocolEnd={onProtocolEnd} steps={SHORT_STEPS} />);

    await waitFor(() => expect(onProtocolEnd).toHaveBeenCalledTimes(1), { timeout: 1000 });

    // Sanity: extra time after completion does not re-fire.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(onProtocolEnd).toHaveBeenCalledTimes(1);
  });

  it("advances to the next step when the forward arrow is pressed", () => {
    render(<CalmingProtocol onProtocolEnd={() => {}} steps={SHORT_STEPS} />);
    expect(screen.getByText("Step one.")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Next step"));
    expect(screen.getByText("Step two.")).toBeTruthy();
  });

  it("returns to the previous step when the back arrow is pressed", () => {
    render(<CalmingProtocol onProtocolEnd={() => {}} steps={SHORT_STEPS} />);

    fireEvent.press(screen.getByLabelText("Next step"));
    expect(screen.getByText("Step two.")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Previous step"));
    expect(screen.getByText("Step one.")).toBeTruthy();
  });

  it("disables the back arrow on the first step and re-enables it after", () => {
    render(<CalmingProtocol onProtocolEnd={() => {}} steps={SHORT_STEPS} />);

    const back = screen.getByLabelText("Previous step");
    expect(back.props.accessibilityState).toEqual({ disabled: true });

    // Pressing it on step 0 is a no-op rather than an underflow.
    fireEvent.press(back);
    expect(screen.getByText("Step one.")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Next step"));
    expect(
      screen.getByLabelText("Previous step").props.accessibilityState,
    ).toEqual({ disabled: false });
  });

  it("finishes the protocol when the forward arrow is pressed on the last step", () => {
    const onProtocolEnd = jest.fn();
    render(<CalmingProtocol onProtocolEnd={onProtocolEnd} steps={SHORT_STEPS} />);

    fireEvent.press(screen.getByLabelText("Next step"));
    fireEvent.press(screen.getByLabelText("Next step"));
    expect(screen.getByText("Step three.")).toBeTruthy();
    expect(onProtocolEnd).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Next step"));
    expect(onProtocolEnd).toHaveBeenCalledTimes(1);
  });

  it("restarts the step timer when a step is re-entered via the arrows", async () => {
    render(<CalmingProtocol onProtocolEnd={() => {}} steps={SHORT_STEPS} />);

    // Let step one's 150ms timer nearly elapse, then arrow forward and back.
    // If the timer were not reset by the remount, step one would immediately
    // auto-advance again; instead it must sit for a fresh full duration.
    await new Promise((resolve) => setTimeout(resolve, 120));
    fireEvent.press(screen.getByLabelText("Next step"));
    fireEvent.press(screen.getByLabelText("Previous step"));

    expect(screen.getByText("Step one.")).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(screen.getByText("Step one.")).toBeTruthy();
  });

  it("renders progress dots matching the step count", () => {
    const { toJSON } = render(
      <CalmingProtocol onProtocolEnd={() => {}} steps={SHORT_STEPS} />,
    );
    // Three dots = three steps. Count sibling views with the dot width.
    const tree = JSON.stringify(toJSON());
    const dotMatches = tree.match(/"width":6/g) ?? [];
    expect(dotMatches.length).toBe(3);
  });
});
