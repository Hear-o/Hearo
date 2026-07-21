import { render, screen } from "@testing-library/react-native";

import { OnboardingBreadcrumb } from "../OnboardingBreadcrumb";

// Tier 2 — onboarding. This is the only progress signal a first-launch user
// gets across Permissions → Screening (3 sub-steps) → Psychoed, so the
// contract that matters is: exactly one dot ever reads as "active" (grown +
// full width) for a given macro/sub-step pair, and completed/upcoming dots
// land on the correct side of it. Visual-only — no press handlers to test.
describe("OnboardingBreadcrumb", () => {
  function widthOf(testID: string) {
    const style = screen.getByTestId(testID).props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    return flat.width;
  }

  it("renders all 5 dots (permissions, 3 screening sub-dots, psychoed)", () => {
    render(<OnboardingBreadcrumb step="permissions" />);
    expect(screen.getByTestId("breadcrumb-dot-permissions")).toBeTruthy();
    expect(screen.getByTestId("breadcrumb-dot-screening-0")).toBeTruthy();
    expect(screen.getByTestId("breadcrumb-dot-screening-1")).toBeTruthy();
    expect(screen.getByTestId("breadcrumb-dot-screening-2")).toBeTruthy();
    expect(screen.getByTestId("breadcrumb-dot-psychoed")).toBeTruthy();
  });

  it("grows only the permissions dot on step=permissions", () => {
    render(<OnboardingBreadcrumb step="permissions" />);
    expect(widthOf("breadcrumb-dot-permissions")).toBe(18);
    expect(widthOf("breadcrumb-dot-screening-0")).toBe(6);
    expect(widthOf("breadcrumb-dot-psychoed")).toBe(6);
  });

  it("grows exactly the current screening sub-dot and completes the ones before it", () => {
    render(<OnboardingBreadcrumb step="screening" screeningSubStep={1} />);
    expect(widthOf("breadcrumb-dot-permissions")).toBe(6); // completed, not active
    expect(widthOf("breadcrumb-dot-screening-0")).toBe(6); // completed
    expect(widthOf("breadcrumb-dot-screening-1")).toBe(18); // active
    expect(widthOf("breadcrumb-dot-screening-2")).toBe(6); // upcoming
    expect(widthOf("breadcrumb-dot-psychoed")).toBe(6); // upcoming
  });

  it("defaults to sub-step 0 when screeningSubStep is omitted", () => {
    render(<OnboardingBreadcrumb step="screening" />);
    expect(widthOf("breadcrumb-dot-screening-0")).toBe(18);
  });

  it("marks all screening sub-dots upcoming before screening starts", () => {
    render(<OnboardingBreadcrumb step="permissions" />);
    // upcoming dots are dim (opacity 0.4); completed/active are full opacity.
    const style = screen.getByTestId("breadcrumb-dot-screening-0").props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.opacity).toBeCloseTo(0.4);
  });

  it("marks permissions and all screening sub-dots completed once on psychoed", () => {
    render(<OnboardingBreadcrumb step="psychoed" />);
    expect(widthOf("breadcrumb-dot-permissions")).toBe(6);
    expect(widthOf("breadcrumb-dot-screening-2")).toBe(6);
    expect(widthOf("breadcrumb-dot-psychoed")).toBe(18);
    const style = screen.getByTestId("breadcrumb-dot-screening-2").props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.opacity).toBeCloseTo(1); // completed, not dim
  });

  it("regresses correctly when re-rendered backward (outcome → items → intro)", () => {
    const { rerender } = render(
      <OnboardingBreadcrumb step="screening" screeningSubStep={2} />,
    );
    expect(widthOf("breadcrumb-dot-screening-2")).toBe(18);

    rerender(<OnboardingBreadcrumb step="screening" screeningSubStep={1} />);
    expect(widthOf("breadcrumb-dot-screening-1")).toBe(18);
    expect(widthOf("breadcrumb-dot-screening-2")).toBe(6);

    rerender(<OnboardingBreadcrumb step="screening" screeningSubStep={0} />);
    expect(widthOf("breadcrumb-dot-screening-0")).toBe(18);
    expect(widthOf("breadcrumb-dot-screening-1")).toBe(6);
  });
});
