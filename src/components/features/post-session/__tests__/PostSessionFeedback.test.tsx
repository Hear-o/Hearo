import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { PostSessionFeedback } from "@/components/features/post-session";

// v1.1.8: feedback no longer has a Next/Done button — selections auto-advance
// after a 600ms confirmation delay (Hili UX review). Tests now flush the
// delay with fake timers instead of pressing Next.
describe("PostSessionFeedback", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the first question on mount", () => {
    render(<PostSessionFeedback onSubmit={() => {}} onSkip={() => {}} />);
    expect(screen.getByText("How difficult was this session?")).toBeTruthy();
  });

  it("calls onSkip without submitting answers", () => {
    const onSkip = jest.fn();
    const onSubmit = jest.fn();

    render(<PostSessionFeedback onSubmit={onSubmit} onSkip={onSkip} />);

    fireEvent.press(screen.getByText("Skip"));

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("auto-advances after each selection and submits the final answer", () => {
    const onSubmit = jest.fn();

    render(<PostSessionFeedback onSubmit={onSubmit} onSkip={() => {}} />);

    fireEvent.press(screen.getByText("3"));
    act(() => { jest.advanceTimersByTime(700); });

    fireEvent.press(screen.getByText("A little"));
    act(() => { jest.advanceTimersByTime(700); });

    fireEvent.press(screen.getByText("About the same"));
    act(() => { jest.advanceTimersByTime(700); });

    expect(onSubmit).toHaveBeenCalledWith({
      difficulty: 3,
      triggerImpact: "a-little",
      moodChange: "same",
    });
  });
});
