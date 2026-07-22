// Single source of truth for the onboarding macro-step order, shared by
// OnboardingBreadcrumb and every screen that renders it. Keeps step order
// out of each screen's own logic so they can't silently drift apart.
export const ONBOARDING_MACRO_STEPS = ["permissions", "screening", "psychoed"] as const;
export type OnboardingMacroStep = (typeof ONBOARDING_MACRO_STEPS)[number];

export const SCREENING_SUB_STEP_COUNT = 3;
