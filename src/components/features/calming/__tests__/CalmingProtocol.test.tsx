import { render, screen, waitFor } from "@testing-library/react-native";

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
