import { act, render, screen } from "@testing-library/react-native";

import { BoxBreathingTimer } from "@/components/features/calming/BoxBreathingTimer";
import type { CalmingBoxBreathingStep } from "@/lib/content/content";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const TWO_CYCLE_STEP: CalmingBoxBreathingStep = {
  kind: "box-breathing",
  cycles: 2,
  phaseMs: 100, // shrunken for test speed; the 4 → 4 → 4 → 4 contract is in the content getter, not here
  prompts: {
    inhale: { en: "Breathe in", he: "שאיפה" },
    hold: { en: "Hold", he: "החזקה" },
    exhale: { en: "Breathe out", he: "נשיפה" },
  },
};

describe("BoxBreathingTimer", () => {
  it("renders the inhale prompt on mount", () => {
    render(<BoxBreathingTimer step={TWO_CYCLE_STEP} onComplete={() => {}} />);
    expect(screen.getByText("Breathe in")).toBeTruthy();
  });

  it("advances inhale → hold → exhale → hold across one cycle", () => {
    render(<BoxBreathingTimer step={TWO_CYCLE_STEP} onComplete={() => {}} />);

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByText("Hold")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByText("Breathe out")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByText("Hold")).toBeTruthy();
  });

  it("invokes onComplete exactly once after `cycles × 4 × phaseMs`", () => {
    const onComplete = jest.fn();
    render(<BoxBreathingTimer step={TWO_CYCLE_STEP} onComplete={onComplete} />);

    // 2 cycles × 4 phases × 100ms = 800ms total
    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
