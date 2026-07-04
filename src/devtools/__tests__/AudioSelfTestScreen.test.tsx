import { act, render, screen, waitFor } from "@testing-library/react-native";

import * as mockFileSystemLegacy from "../../../test/mocks/expo-file-system-legacy";
import {
  runAudioSelfTest,
  formatSelfTestLog,
} from "@/lib/audio/audioSelfTest";
import AudioSelfTestScreen, {
  AUDIO_SELF_TEST_TIMEOUT_MS,
} from "../AudioSelfTestScreen";

jest.mock("expo-file-system/legacy", () => mockFileSystemLegacy);

jest.mock("@/lib/audio/audioSelfTest", () => ({
  runAudioSelfTest: jest.fn(),
  formatSelfTestLog: jest.fn(
    (result: { pass: boolean; offlineRms: number; offlinePeak: number; realtimeLevel: number }) =>
      `AUDIO_SELFTEST_RESULT=${result.pass ? "PASS" : "FAIL"} ` +
      `offlineRms=${result.offlineRms.toFixed(4)} ` +
      `offlinePeak=${result.offlinePeak.toFixed(4)} ` +
      `realtimeLevel=${result.realtimeLevel.toFixed(4)}`,
  ),
}));

const runAudioSelfTestMock = jest.mocked(runAudioSelfTest);
const formatSelfTestLogMock = jest.mocked(formatSelfTestLog);

describe("AudioSelfTestScreen", () => {
  const originalFlag = process.env.EXPO_PUBLIC_AUDIO_SELFTEST;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_AUDIO_SELFTEST = "1";
    mockFileSystemLegacy.__reset();
    jest.useRealTimers();
    jest.spyOn(console, "log").mockImplementation(() => {});
    runAudioSelfTestMock.mockReset();
    formatSelfTestLogMock.mockClear();
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_AUDIO_SELFTEST = originalFlag;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("writes the passing self-test result to Documents", async () => {
    const result = {
      offlineRms: 0.35,
      offlinePeak: 0.5,
      realtimeLevel: 0.8,
      pass: true,
    };
    runAudioSelfTestMock.mockResolvedValue(result);

    render(<AudioSelfTestScreen />);

    await waitFor(() =>
      expect(mockFileSystemLegacy.writeAsStringAsync).toHaveBeenCalledWith(
        "file:///documents/audio-selftest.json",
        JSON.stringify(result),
      ),
    );
    expect(screen.getByTestId("audio-selftest-status").props.children).toBe("PASS");
    expect(console.log).toHaveBeenCalledWith("AUDIO_SELFTEST_STARTED");
    expect(console.log).toHaveBeenCalledWith(formatSelfTestLogMock(result));
  });

  it("writes a failure result if the native self-test never resolves", async () => {
    jest.useFakeTimers();
    runAudioSelfTestMock.mockReturnValue(new Promise(() => {}));

    render(<AudioSelfTestScreen />);

    await act(async () => {
      jest.advanceTimersByTime(AUDIO_SELF_TEST_TIMEOUT_MS);
    });

    await waitFor(() =>
      expect(mockFileSystemLegacy.writeAsStringAsync).toHaveBeenCalledWith(
        "file:///documents/audio-selftest.json",
        JSON.stringify({
          pass: false,
          error: `audio self-test timed out after ${AUDIO_SELF_TEST_TIMEOUT_MS}ms`,
        }),
      ),
    );
    expect(screen.getByTestId("audio-selftest-status").props.children).toBe("ERROR");
    expect(console.log).toHaveBeenCalledWith(
      `AUDIO_SELFTEST_RESULT=FAIL error=audio self-test timed out after ${AUDIO_SELF_TEST_TIMEOUT_MS}ms`,
    );
  });
});
