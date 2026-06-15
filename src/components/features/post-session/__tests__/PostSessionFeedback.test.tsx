import { fireEvent, render, screen } from "@testing-library/react-native";

import { PostSessionFeedback } from "@/components/features/post-session";

describe("PostSessionFeedback", () => {
  it("does not advance from required questions before an answer is selected", () => {
    render(<PostSessionFeedback onSubmit={() => {}} onSkip={() => {}} />);

    expect(screen.getByText("How difficult was this session?")).toBeTruthy();

    fireEvent.press(screen.getByText("Next"));

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

  it("submits selected answers after the final required step", () => {
    const onSubmit = jest.fn();

    render(<PostSessionFeedback onSubmit={onSubmit} onSkip={() => {}} />);

    fireEvent.press(screen.getByText("3"));
    fireEvent.press(screen.getByText("Next"));

    fireEvent.press(screen.getByText("A little"));
    fireEvent.press(screen.getByText("Next"));

    fireEvent.press(screen.getByText("About the same"));
    fireEvent.press(screen.getByText("Done"));

    expect(onSubmit).toHaveBeenCalledWith({
      difficulty: 3,
      triggerImpact: "a-little",
      moodChange: "same",
    });
  });
});
