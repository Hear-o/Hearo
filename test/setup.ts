// Component-test setup (Phase 2, ADR-001). Logic-layer suites in src/lib need
// none of this; it's wired only so RNTL can render the native UI components,
// which pull in reanimated, gesture-handler, and i18n.

// Gesture-handler's own jest shim — provides the native module stubs that
// GestureDetector/Gesture.Pan() touch on import.
require("react-native-gesture-handler/jestSetup");

// Reanimated ships a jest mock that turns worklets/animations into synchronous
// no-ops. Without it, useSharedValue/withTiming throw under jsdom.
jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

// AsyncStorage's native module is null under jest. The package ships an
// in-memory mock for tests — wire it up here so any test that touches storage
// (directly or transitively, e.g. via lib/trustedContacts → lib/storage)
// resolves without "NativeModule: AsyncStorage is null".
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// i18n imports expo-localization at module load. Mock it before importing i18n
// so every Jest worker starts with the same deterministic device locale.
jest.mock("expo-localization", () => ({
  getLocales: jest.fn(() => [{ languageCode: "en" }]),
}));

// useFocusEffect needs a navigation context to subscribe to focus events.
// Logic-layer hooks (e.g. useDisplayName) that call it would fail in
// renderHook tests otherwise. No-op the focus callback in tests — the
// primary useEffect still runs and that's what the assertions assert.
jest.mock("expo-router", () => {
  const actual = jest.requireActual("expo-router");
  return {
    ...actual,
    useFocusEffect: (_cb: unknown) => {},
  };
});

// Initialize i18n once so useTranslation() resolves real keys. The mocked
// device locale starts in English; keep it pinned there for copy assertions.
import i18n from "@/lib/ui/i18n";
import { useCrisisStore } from "@/lib/storage/crisis-store";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

// Zustand stores are module singletons — reset shared safety state between tests
// so one test opening the crisis sheet can't leak into the next. Done in
// beforeEach (not afterEach) so it runs after RNTL has already unmounted the
// previous test's tree, avoiding an act() warning from re-rendering a live tree.
beforeEach(() => {
  useCrisisStore.setState({ isOpen: false });
});
