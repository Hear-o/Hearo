import { render, screen } from "@testing-library/react-native";

import { OnboardingBreadcrumb, resolveStates } from "../OnboardingBreadcrumb";

// Tier 2 — onboarding. This is the only progress signal a first-launch user
// gets across Permissions → Screening (3 sub-steps) → Psychoed, so the
// contract that matters is: exactly one dot ever reads as "active" for a
// given macro/sub-step pair, and completed/upcoming dots land on the correct
// side of it.
//
// The state logic (resolveStates) is tested directly, as a pure function,
// rather than by reading rendered/animated style. Reanimated's Jest mock
// makes the latter unreliable here: useSharedValue's mock has no persistence
// across renders (no useRef backing — every render creates a fresh instance)
// and useAnimatedStyle's mock only computes once, at render time, so a
// mount effect's mutation (see Dot in OnboardingBreadcrumb.tsx) can never be
// observed through rendered style no matter how the test rerenders. Every
// other animated component test in this repo (VoiceLine, BreathingCircle,
// …) follows the same principle: verify logic/content, not animated numeric
// style. Rendering itself (smoke tests below) is still exercised directly.
describe("resolveStates", () => {
  it("marks permissions active and everything else upcoming on step=permissions", () => {
    expect(resolveStates("permissions", undefined)).toEqual([
      "active",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
  });

  it("completes permissions and marks the current screening sub-dot active", () => {
    expect(resolveStates("screening", 1)).toEqual([
      "completed", // permissions
      "completed", // sub 0
      "active", // sub 1
      "upcoming", // sub 2
      "upcoming", // psychoed
    ]);
  });

  it("defaults to sub-step 0 when screeningSubStep is omitted", () => {
    expect(resolveStates("screening", undefined)).toEqual([
      "completed",
      "active",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
  });

  it("completes permissions and all screening sub-dots, activates psychoed", () => {
    expect(resolveStates("psychoed", undefined)).toEqual([
      "completed",
      "completed",
      "completed",
      "completed",
      "active",
    ]);
  });

  it("regresses correctly when sub-step goes backward (outcome → items → intro)", () => {
    expect(resolveStates("screening", 2)).toEqual([
      "completed",
      "completed",
      "completed",
      "active",
      "upcoming",
    ]);
    expect(resolveStates("screening", 1)).toEqual([
      "completed",
      "completed",
      "active",
      "upcoming",
      "upcoming",
    ]);
    expect(resolveStates("screening", 0)).toEqual([
      "completed",
      "active",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
  });

  it("skips the items sub-dot correctly on the no-trauma-exposure branch (0→2 jump)", () => {
    // handleTraumaExposureAnswer(false) in screening.tsx goes straight from
    // sub-step 0 (intro) to sub-step 2 (outcome), never visiting 1 (items).
    expect(resolveStates("screening", 2)[2]).toBe("completed"); // sub 1, skipped but still completed
    expect(resolveStates("screening", 2)[3]).toBe("active"); // sub 2
  });
});

describe("OnboardingBreadcrumb", () => {
  it("renders all 5 dots (permissions, 3 screening sub-dots, psychoed)", () => {
    render(<OnboardingBreadcrumb step="permissions" />);
    expect(screen.getByTestId("breadcrumb-dot-permissions")).toBeTruthy();
    expect(screen.getByTestId("breadcrumb-dot-screening-0")).toBeTruthy();
    expect(screen.getByTestId("breadcrumb-dot-screening-1")).toBeTruthy();
    expect(screen.getByTestId("breadcrumb-dot-screening-2")).toBeTruthy();
    expect(screen.getByTestId("breadcrumb-dot-psychoed")).toBeTruthy();
  });

  it("renders without throwing for every step, including a fresh mount at each screening sub-step", () => {
    expect(() => render(<OnboardingBreadcrumb step="permissions" />)).not.toThrow();
    expect(() =>
      render(<OnboardingBreadcrumb step="screening" screeningSubStep={0} />),
    ).not.toThrow();
    expect(() =>
      render(<OnboardingBreadcrumb step="screening" screeningSubStep={1} />),
    ).not.toThrow();
    expect(() =>
      render(<OnboardingBreadcrumb step="screening" screeningSubStep={2} />),
    ).not.toThrow();
    expect(() => render(<OnboardingBreadcrumb step="psychoed" />)).not.toThrow();
  });
});
