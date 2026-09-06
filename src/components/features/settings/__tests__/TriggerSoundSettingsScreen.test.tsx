import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { getSound } from "@/lib/content/content";
import { useSessionStore } from "@/lib/storage/session-store";
import {
  getTriggerSoundPreference,
  setTriggerSoundPreference,
} from "@/lib/storage/storage";
import { TriggerSoundSettingsScreen } from "../TriggerSoundSettingsScreen";

const mockRouterBack = jest.fn();
const mockLoadTrigger = jest.fn().mockResolvedValue(undefined);
const mockPlayTriggerPreview = jest.fn().mockResolvedValue(undefined);
const mockStopTriggerPreview = jest.fn();
const mockDestroy = jest.fn();
const mockActivateAudioSession = jest.fn().mockResolvedValue(true);

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockRouterBack }),
  useFocusEffect: (_callback: unknown) => {},
}));

jest.mock("@/components/common/Icon", () => ({
  Icon: () => null,
}));

jest.mock("@/lib/audio/audio-session", () => ({
  activateAudioSession: () => mockActivateAudioSession(),
}));

jest.mock("@/lib/audio/audio-engine", () => ({
  dBToGain: (db: number) => Math.pow(10, db / 20),
  AudioEngine: jest.fn().mockImplementation(() => ({
    loadTrigger: mockLoadTrigger,
    playTriggerPreview: mockPlayTriggerPreview,
    stopTriggerPreview: mockStopTriggerPreview,
    destroy: mockDestroy,
  })),
}));

describe("TriggerSoundSettingsScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockRouterBack.mockReset();
    mockLoadTrigger.mockClear();
    mockPlayTriggerPreview.mockClear();
    mockStopTriggerPreview.mockClear();
    mockDestroy.mockClear();
    mockActivateAudioSession.mockClear();
    useSessionStore.setState({ sounds: ["siren"] });
  });

  async function waitForPreviewButtonEnabled() {
    await waitFor(() => {
      expect(screen.getByTestId("preview-trigger-sound").props.accessibilityState.disabled).toBe(false);
    });
  }

  it("loads the legacy defaults with accessible controls", async () => {
    render(<TriggerSoundSettingsScreen />);

    expect(await screen.findByText("Practice sound")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getAllByText("100%")).toHaveLength(2);
      expect(screen.getByText("Steady")).toBeTruthy();
      expect(screen.getByText(/every 60 seconds/)).toBeTruthy();
    });

    expect(screen.getByLabelText("Starting volume").props.accessibilityRole).toBe(
      "adjustable",
    );
    expect(screen.getByLabelText("Starting volume").props.accessibilityActions).toEqual([
      { name: "increment", label: "Increase" },
      { name: "decrement", label: "Decrease" },
    ]);
  });

  it("updates linked ranges and persists the draft", async () => {
    render(<TriggerSoundSettingsScreen />);
    await screen.findByText("Steady");
    await waitFor(() => {
      expect(screen.getByTestId("minimum-volume-slider").props.accessibilityState.disabled).toBe(false);
    });

    await act(async () => {
      screen.getByTestId("minimum-volume-slider").props.onAccessibilityAction({
        nativeEvent: { actionName: "decrement" },
      });
      screen.getByTestId("maximum-volume-slider").props.onAccessibilityAction({
        nativeEvent: { actionName: "decrement" },
      });
      screen.getByTestId("pace-slider").props.onAccessibilityAction({
        nativeEvent: { actionName: "increment" },
      });
    });

    expect(screen.getAllByText("84%")).toHaveLength(2);
    expect(screen.getByText("Frequent")).toBeTruthy();
    expect(screen.getByText(/every 40 seconds/)).toBeTruthy();

    fireEvent.press(screen.getByTestId("save-trigger-sound"));

    await waitFor(() => expect(mockRouterBack).toHaveBeenCalledTimes(1));
    expect(await getTriggerSoundPreference()).toEqual({
      schemaVersion: 1,
      minimumPeakDb: -21,
      maximumPeakDb: -21,
      triggersPerMinute: 1.5,
    });
  });

  it("always previews the motorcycle sound at the draft maximum", async () => {
    render(<TriggerSoundSettingsScreen />);
    await screen.findByText("Test sound");
    await waitForPreviewButtonEnabled();
    await waitFor(() => {
      expect(screen.getByTestId("maximum-volume-slider").props.accessibilityState.disabled).toBe(false);
    });
    await act(async () => {
      screen.getByTestId("maximum-volume-slider").props.onAccessibilityAction({
        nativeEvent: { actionName: "decrement" },
      });
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("preview-trigger-sound"));
    });

    expect(mockActivateAudioSession).toHaveBeenCalledTimes(1);
    expect(mockLoadTrigger).toHaveBeenCalledTimes(1);
    expect(mockLoadTrigger).toHaveBeenCalledWith(
      getSound("motorcycle").audioVariations[0],
    );
    expect(mockPlayTriggerPreview).toHaveBeenCalledWith(
      Math.pow(10, -21 / 20),
    );
  });

  it("shows an error instead of attempting a preview when audio activation fails", async () => {
    mockActivateAudioSession.mockResolvedValueOnce(false);
    render(<TriggerSoundSettingsScreen />);
    await screen.findByText("Test sound");
    await waitForPreviewButtonEnabled();

    await act(async () => {
      fireEvent.press(screen.getByTestId("preview-trigger-sound"));
    });

    expect(await screen.findByText("Couldn't play the test sound. Please try again.")).toBeTruthy();
    expect(mockLoadTrigger).not.toHaveBeenCalled();
    expect(mockPlayTriggerPreview).not.toHaveBeenCalled();
  });

  it("does not start a preview after navigating back during activation", async () => {
    let resolveActivation: (value: boolean) => void = () => {};
    mockActivateAudioSession.mockImplementationOnce(
      () => new Promise<boolean>((resolve) => { resolveActivation = resolve; }),
    );
    render(<TriggerSoundSettingsScreen />);
    await screen.findByText("Test sound");
    await waitForPreviewButtonEnabled();

    fireEvent.press(screen.getByTestId("preview-trigger-sound"));
    fireEvent.press(screen.getByLabelText("Back to settings"));
    await act(async () => { resolveActivation(true); });

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(mockActivateAudioSession).toHaveBeenCalledTimes(1);
    expect(mockLoadTrigger).not.toHaveBeenCalled();
    expect(mockPlayTriggerPreview).not.toHaveBeenCalled();
  });

  it("restores the preview control when saving fails during a preview", async () => {
    const pendingPreview = new Promise<void>(() => {});
    mockPlayTriggerPreview.mockImplementationOnce(() => pendingPreview);
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error("storage unavailable"),
    );
    render(<TriggerSoundSettingsScreen />);
    await screen.findByText("Test sound");
    await waitForPreviewButtonEnabled();

    fireEvent.press(screen.getByTestId("preview-trigger-sound"));
    await waitFor(() => expect(mockPlayTriggerPreview).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Playing…")).toBeTruthy();

    fireEvent.press(screen.getByTestId("save-trigger-sound"));

    expect(await screen.findByText("Couldn't save the changes. Please try again.")).toBeTruthy();
    expect(screen.getByText("Test sound")).toBeTruthy();
  });

  it("does not navigate twice when Back is pressed during a pending save", async () => {
    let resolveSave: () => void = () => {};
    (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveSave = resolve; }),
    );
    render(<TriggerSoundSettingsScreen />);
    await waitForPreviewButtonEnabled();

    fireEvent.press(screen.getByTestId("save-trigger-sound"));
    fireEvent.press(screen.getByLabelText("Back to settings"));
    await act(async () => { resolveSave(); });

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it("resets a saved preference back to the legacy defaults", async () => {
    await setTriggerSoundPreference({
      schemaVersion: 1,
      minimumPeakDb: -30,
      maximumPeakDb: -24,
      triggersPerMinute: 0.5,
    });
    render(<TriggerSoundSettingsScreen />);
    await screen.findByText("Slow");

    fireEvent.press(screen.getByText("Reset to defaults"));

    expect(screen.getAllByText("100%")).toHaveLength(2);
    expect(screen.getByText("Steady")).toBeTruthy();
  });
});
