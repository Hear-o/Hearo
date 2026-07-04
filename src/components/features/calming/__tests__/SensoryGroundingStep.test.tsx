import { render, screen, waitFor } from "@testing-library/react-native";

import { SensoryGroundingStep } from "@/components/features/calming/SensoryGroundingStep";
import type { CalmingSensoryStep } from "@/lib/content/content";

// Short real timers — fake-timer chaining stalls across re-renders here too.

// Durations long enough that waitFor's ~50ms polling catches each transition
// in turn. The real protocol uses ~9s per sub-step; here we just need
// "noticeable" gaps between state changes, not realistic clinical timing.
const STEP: CalmingSensoryStep = {
  kind: "sensory-grounding",
  steps: [
    { count: 3, prompt: { en: "See three.", he: "ראה שלוש." }, durationMs: 150 },
    { count: 2, prompt: { en: "Hear two.", he: "שמע שתיים." }, durationMs: 150 },
    { count: 1, prompt: { en: "Touch one.", he: "גע באחד." }, durationMs: 150 },
  ],
};

describe("SensoryGroundingStep", () => {
  it("renders the first sub-step on mount", () => {
    render(<SensoryGroundingStep step={STEP} onComplete={() => {}} />);
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("See three.")).toBeTruthy();
  });

  it("advances 3 → 2 → 1 in order", async () => {
    render(<SensoryGroundingStep step={STEP} onComplete={() => {}} />);

    await waitFor(() => expect(screen.getByText("2")).toBeTruthy(), { timeout: 500 });
    expect(screen.getByText("Hear two.")).toBeTruthy();

    await waitFor(() => expect(screen.getByText("1")).toBeTruthy(), { timeout: 500 });
    expect(screen.getByText("Touch one.")).toBeTruthy();
  });

  it("invokes onComplete exactly once after the final sub-step's duration", async () => {
    const onComplete = jest.fn();
    render(<SensoryGroundingStep step={STEP} onComplete={onComplete} />);

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 1000 });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
