import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AppState, AppStateStatus, View } from "react-native";
import Calming from "@/app/calming";
import { activateAudioSession } from "@/lib/audio/audio-session";
import { useCrisisStore } from "@/lib/storage/crisis-store";
import { useSessionStore } from "@/lib/storage/session-store";
import { getCalmingProtocol, localize } from "@/lib/content/content";
import i18n from "@/lib/ui/i18n";
import * as audioApi from "../../../../../test/mocks/react-native-audio-api";

const mockBack = jest.fn();
const mockTransition = jest.fn((callback: () => void) => callback());
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(callback, [callback]);
  },
}));
jest.mock("@/lib/ui/fadeTransition", () => ({
  usePageFade: () => ({ animatedStyle: {}, transition: mockTransition }),
}));
jest.mock("@/lib/audio/audio-session", () => ({ activateAudioSession: jest.fn().mockResolvedValue(true) }));
jest.mock("@/lib/audio/audio-log", () => ({ audioWarn: jest.fn() }));
jest.mock("../../../../../test/assetMock.js", () => {
  const { View: MockView } = jest.requireActual<typeof import("react-native")>("react-native");
  return function MockAsset(props: object) { return <MockView {...props} />; };
});
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: (props: React.ComponentProps<typeof View>) => {
    const { View: MockView } = jest.requireActual<typeof import("react-native")>("react-native");
    return <MockView {...props} />;
  },
}));

const activation = jest.mocked(activateAudioSession);
let appChange: (state: AppStateStatus) => void;
function validation(language = "en") {
  const step = getCalmingProtocol()[0];
  if (!("text" in step)) throw new Error("First protocol step must be validation");
  return localize(step.text, language);
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
  mockBack.mockReset();
  mockTransition.mockClear();
  activation.mockReset().mockResolvedValue(true);
  audioApi.__reset();
  useSessionStore.setState({ lastEndedBy: null });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
    appChange = listener;
    return { remove: jest.fn() };
  });
});

afterEach(() => jest.restoreAllMocks());

it("offers visual guidance while loading and while the recording plays", async () => {
  render(<Calming />);
  expect(screen.getByText("Loading relaxation audio…")).toBeTruthy();
  expect(screen.getByText("Use visual guidance")).toBeTruthy();
  await waitFor(() => expect(screen.getByText("Pause")).toBeTruthy());
  expect(screen.queryByText(validation())).toBeNull();
  fireEvent.press(screen.getByText("Use visual guidance"));
  expect(screen.getByText(validation())).toBeTruthy();
  expect(audioApi.__lastContext().sources[0].stop).toHaveBeenCalled();
  expect(audioApi.__lastContext().sources[0].onEnded).toBeNull();
  expect(mockBack).not.toHaveBeenCalled();
});

it("shows reviewed guidance on activation failure and can retry", async () => {
  activation.mockResolvedValueOnce(false);
  render(<Calming />);
  await waitFor(() => expect(screen.getByText(validation())).toBeTruthy());
  expect(screen.getByText("Couldn't play the recording. Please try again.")).toBeTruthy();
  expect(screen.getByLabelText("open crisis support")).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("Try again"));
  await waitFor(() => expect(screen.getByText("Pause")).toBeTruthy());
  expect(screen.queryByText(validation())).toBeNull();
  fireEvent.press(screen.getByText("Use visual guidance"));
  expect(screen.getByText(validation())).toBeTruthy();
});

it("hides visual guidance during audio retries, restores its step on failure and completes audio independently", async () => {
  activation.mockResolvedValueOnce(false);
  render(<Calming />);
  await waitFor(() => expect(screen.getByText(validation())).toBeTruthy());
  fireEvent.press(screen.getByLabelText("Next step"));
  const body = getCalmingProtocol()[1];
  if (!("text" in body)) throw new Error("Body grounding needs text");
  const bodyText = localize(body.text, "en");
  expect(screen.getByText(bodyText)).toBeTruthy();
  let rejectActivation!: (value: boolean) => void;
  activation.mockReturnValueOnce(new Promise<boolean>((resolve) => { rejectActivation = resolve; }));
  fireEvent.press(screen.getByText("Try again"));
  expect(screen.getByText("Loading relaxation audio…")).toBeTruthy();
  expect(screen.queryByText(bodyText)).toBeNull();
  await act(async () => rejectActivation(false));
  await waitFor(() => expect(screen.getByText("Try again")).toBeTruthy());
  expect(screen.getByText(bodyText)).toBeTruthy();
  fireEvent.press(screen.getByText("Try again"));
  await waitFor(() => expect(screen.getByText("Pause")).toBeTruthy());
  expect(screen.queryByText(bodyText)).toBeNull();
  act(() => audioApi.__lastContext().sources[0].onEnded!());
  expect(screen.queryByText(bodyText)).toBeNull();
  expect(screen.getByText("Take your time. Return when you're ready.")).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

it("shows visual guidance when resume activation fails", async () => {
  render(<Calming />);
  await waitFor(() => expect(screen.getByText("Pause")).toBeTruthy());
  fireEvent.press(screen.getByText("Pause"));
  await waitFor(() => expect(screen.getByText("Resume")).toBeTruthy());
  activation.mockResolvedValueOnce(false);
  fireEvent.press(screen.getByText("Resume"));
  await waitFor(() => expect(screen.getByText(validation())).toBeTruthy());
  expect(audioApi.__lastContext().sources[0].onEnded).toBeNull();
  expect(mockBack).not.toHaveBeenCalled();
});

it("provides Hebrew visual guidance when Hebrew audio cannot play", async () => {
  await i18n.changeLanguage("he");
  activation.mockResolvedValueOnce(false);
  render(<Calming />);
  await waitFor(() => expect(screen.getByText(validation("he"))).toBeTruthy());
  expect(screen.getByText("ניסיון נוסף")).toBeTruthy();
});

it("waits for explicit return after completing all visual steps", async () => {
  render(<Calming />);
  fireEvent.press(screen.getByText("Use visual guidance"));
  for (let step = 0; step < getCalmingProtocol().length; step++) {
    fireEvent.press(screen.getByLabelText("Next step"));
  }
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockTransition).not.toHaveBeenCalled();
  expect(screen.getByText("Take your time. Return when you're ready.")).toBeTruthy();
  expect(screen.queryByLabelText("Next step")).toBeNull();
  expect(useSessionStore.getState().lastEndedBy).toBe("calming-protocol");
  fireEvent.press(screen.getByText("Return"));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it("waits for explicit return on natural recording completion", async () => {
  render(<Calming />);
  await waitFor(() => expect(screen.getByText("Pause")).toBeTruthy());
  const end = audioApi.__lastContext().sources[0].onEnded!;
  act(() => { end(); end(); });
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockTransition).not.toHaveBeenCalled();
  expect(screen.getByText("Take your time. Return when you're ready.")).toBeTruthy();
  expect(screen.queryByText("Pause")).toBeNull();
  expect(useSessionStore.getState().lastEndedBy).toBe("calming-protocol");
  fireEvent.press(screen.getByText("Return"));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it("keeps the calming route open when the last visual step completes automatically", () => {
  jest.useFakeTimers();
  try {
    render(<Calming />);
    fireEvent.press(screen.getByText("Use visual guidance"));
    const steps = getCalmingProtocol();
    for (let step = 0; step < steps.length - 1; step++) {
      fireEvent.press(screen.getByLabelText("Next step"));
    }
    const closing = steps[steps.length - 1];
    if (!("durationMs" in closing)) throw new Error("Final step must have a duration");
    act(() => jest.advanceTimersByTime(closing.durationMs));
    expect(screen.getByText("Take your time. Return when you're ready.")).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockTransition).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});

it("does not navigate or restart audio when narration ends in background and the app foregrounds", async () => {
  render(<Calming />);
  await waitFor(() => expect(screen.getByText("Pause")).toBeTruthy());
  const ctx = audioApi.__lastContext();
  const end = ctx.sources[0].onEnded!;
  const resumeCount = ctx.resume.mock.calls.length;
  act(() => { appChange("inactive"); appChange("background"); end(); });
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockTransition).not.toHaveBeenCalled();
  expect(ctx.sources[0].onEnded).toBeNull();
  expect(ctx.state).toBe("closed");
  act(() => appChange("active"));
  await act(async () => { await new Promise<void>((resolve) => setImmediate(resolve)); });
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockTransition).not.toHaveBeenCalled();
  expect(ctx.resume).toHaveBeenCalledTimes(resumeCount);
  expect(screen.getByText("Take your time. Return when you're ready.")).toBeTruthy();
  fireEvent.press(screen.getByText("Return"));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it.each(["Return", "Exit calming"])("stops before leaving via %s without recording completion", async (label) => {
  render(<Calming />);
  await waitFor(() => expect(screen.getByText("Pause")).toBeTruthy());
  const end = audioApi.__lastContext().sources[0].onEnded!;
  fireEvent.press(label === "Return" ? screen.getByText(label) : screen.getByLabelText(label));
  expect(audioApi.__lastContext().sources[0].stop).toHaveBeenCalled();
  act(() => end());
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(useSessionStore.getState().lastEndedBy).toBeNull();
});

it("exposes crisis support and suspends the recording while it is open", async () => {
  render(<Calming />);
  await waitFor(() => expect(screen.getByText("Pause")).toBeTruthy());
  fireEvent.press(screen.getByLabelText("open crisis support"));
  await waitFor(() => expect(audioApi.__lastContext().state).toBe("suspended"));
  const supportPause = screen.getByRole("button", { name: "Paused for support" });
  expect(supportPause.props.accessibilityState.disabled).toBe(true);
  fireEvent.press(supportPause);
  act(() => useCrisisStore.getState().close());
  await waitFor(() => expect(audioApi.__lastContext().state).toBe("running"));
  expect(screen.getByText("Pause")).toBeTruthy();
});

it.each([
  ["en", "Relaxation recording", "Use visual guidance", "Visual calming guidance"],
  ["he", "הקלטת הרגעה", "מעבר להנחיות על המסך", "הנחיות הרגעה על המסך"],
])("distinguishes recording and visual headings in %s", async (language, recordingHeading, action, visualHeading) => {
  await i18n.changeLanguage(language);
  render(<Calming />);
  await waitFor(() => expect(screen.getByText(recordingHeading)).toBeTruthy());
  fireEvent.press(screen.getByText(action));
  expect(screen.getByText(visualHeading)).toBeTruthy();
  expect(screen.queryByText(recordingHeading)).toBeNull();
});

it("offers explicit resume after a native interruption even when context state claims running", async () => {
  render(<Calming />);
  await waitFor(() => expect(screen.getByText("Pause")).toBeTruthy());
  act(() => audioApi.__emitInterruption({ type: "began", shouldResume: false }));
  const resume = screen.getByRole("button", { name: "Resume" });
  expect(resume.props.accessibilityState.disabled).toBe(false);
  act(() => audioApi.__emitInterruption({ type: "ended", shouldResume: false }));
  await waitFor(() => expect(audioApi.__lastContext().state).toBe("suspended"));
  audioApi.__lastContext().state = "running";
  act(() => appChange("active"));
  await waitFor(() => expect(screen.getByText("Recording interrupted. Resume when you're ready.")).toBeTruthy());
  expect(screen.getByRole("button", { name: "Resume" }).props.accessibilityState.disabled).toBe(false);
  fireEvent.press(screen.getByText("Resume"));
  await waitFor(() => expect(screen.getByText("Pause")).toBeTruthy());
  expect(audioApi.__lastContext().sources[0].start).toHaveBeenCalledTimes(1);
  expect(mockBack).not.toHaveBeenCalled();
});

it("allows switching from visuals back to narration while keeping the visual step", async () => {
  render(<Calming />);
  fireEvent.press(screen.getByText("Use visual guidance"));
  fireEvent.press(screen.getByLabelText("Next step"));
  const body = getCalmingProtocol()[1];
  if (!("text" in body)) throw new Error("Body grounding needs text");
  const bodyText = localize(body.text, "en");
  expect(screen.getByText(bodyText)).toBeTruthy();
  fireEvent.press(screen.getByText("Play recording"));
  await waitFor(() => expect(screen.getByText("Pause")).toBeTruthy());
  expect(screen.queryByText(bodyText)).toBeNull();
  expect(screen.getByText("Relaxation recording")).toBeTruthy();
  fireEvent.press(screen.getByText("Use visual guidance"));
  expect(screen.getByText(bodyText)).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

it("allows Resume without ended and exposes visual fallback if recovery fails", async () => {
  render(<Calming />);
  await waitFor(() => expect(screen.getByText("Pause")).toBeTruthy());
  act(() => audioApi.__emitInterruption({ type: "began", shouldResume: false }));
  await waitFor(() => expect(audioApi.__lastContext().state).toBe("suspended"));
  activation.mockResolvedValueOnce(false);
  fireEvent.press(screen.getByRole("button", { name: "Resume" }));
  await waitFor(() => expect(screen.getByText("Try again")).toBeTruthy());
  expect(screen.getByText(validation())).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});
