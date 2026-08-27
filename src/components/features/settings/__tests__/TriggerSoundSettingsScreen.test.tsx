import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { TriggerSoundSettingsScreen } from "../TriggerSoundSettingsScreen";
import { useSessionStore } from "@/lib/storage/session-store";
import {
  getTriggerSoundPreference,
  setTriggerSoundPreference,
} from "@/lib/storage/storage";

const mockRouterBack = jest.fn();
const mockLoadTrigger = jest.fn().mockResolvedValue(undefined);
const mockPlayTriggerPreview = jest.fn().mockResolvedValue(undefined);
const mockStopTriggerPreview = jest.fn();
const mockDestroy = jest.fn();
const mockActivateAudioSession = jest.fn().mockResolvedValue(undefined);

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
    useSessionStore.setState({ sounds: ["motorcycle"] });
  });

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

    fireEvent(screen.getByTestId("minimum-volume-slider"), "accessibilityAction", {
      nativeEvent: { actionName: "decrement" },
    });
    fireEvent(screen.getByTestId("maximum-volume-slider"), "accessibilityAction", {
      nativeEvent: { actionName: "decrement" },
    });
    fireEvent(screen.getByTestId("pace-slider"), "accessibilityAction", {
      nativeEvent: { actionName: "increment" },
    });

    expect(screen.getAllByText("83%")).toHaveLength(2);
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

  it("previews the selected sound at the draft maximum", async () => {
    render(<TriggerSoundSettingsScreen />);
    await screen.findByText("Test sound");
    fireEvent(screen.getByTestId("maximum-volume-slider"), "accessibilityAction", {
      nativeEvent: { actionName: "decrement" },
    });

    await act(async () => {
      fireEvent.press(screen.getByText("Test sound"));
    });

    expect(mockActivateAudioSession).toHaveBeenCalledTimes(1);
    expect(mockLoadTrigger).toHaveBeenCalledTimes(1);
    expect(mockPlayTriggerPreview).toHaveBeenCalledWith(
      Math.pow(10, -21 / 20),
    );
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
