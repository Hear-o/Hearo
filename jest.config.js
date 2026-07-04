// Jest config lives here (not in package.json) so package.json stays a clean
// dependency manifest and config changes are easy to spot in diffs.
// See docs/adr/ADR-001 and docs/TEST_COVERAGE_PLAN.md for the coverage strategy.

/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  // Reanimated v4's mock pulls in react-native-worklets, whose `.native` build
  // throws under jsdom; this resolver strips the `.native` extension so the
  // jest-safe variant loads. Required for any component test that renders
  // reanimated/gesture-handler.
  resolver: "react-native-worklets/jest/resolver.js",
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  moduleNameMapper: {
    "\\.(png|jpg|jpeg|gif|webp|svg|mp3|wav|m4a|mp4)$":
      "<rootDir>/test/assetMock.js",
    "^@/assets/(.*)$": "<rootDir>/assets/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/lib/**/*.{ts,tsx}",
    "src/hooks/**/*.{ts,tsx}",
    "src/components/**/*.{ts,tsx}",
    "!src/lib/ui/tokens.ts",
    "!src/lib/ui/i18n.ts",
    // All native-module wrappers are now backfilled and gated — see
    // docs/TEST_BACKFILL_PLAN.md and test/mocks/ for the SDK mocks. No coverage
    // exclusions remain beyond the config/constants files above.
  ],
  coverageThreshold: {
    // src/lib ratcheted to its ADR-001 final target. Glob key = per-file gate.
    // healthKit.ios.ts clears this thanks to two `istanbul ignore` markers on
    // provably-unreachable defensive branches (see that file for why). A
    // per-file threshold key does NOT reliably override a `**` glob in this
    // Jest version, so unreachable branches are annotated at the source instead.
    "./src/lib/**/*.{ts,tsx}": {
      lines: 95,
      branches: 90,
    },
    "./src/hooks/**/*.{ts,tsx}": {
      lines: 95,
      branches: 90,
    },
    // src/components: directory key = aggregate (folder-wide) gate, so a single
    // file with an unreachable branch (e.g. SceneBackground) can't fail the bar.
    "./src/components/": {
      lines: 70,
      branches: 70,
    },
  },
};
