import { renderHook, act } from "@testing-library/react-native";
import { useAudioEngine } from "@/hooks/useAudioEngine";

// Mock AudioEngine so no native audio context is created in the test runner.
const mockEngine = {
  destroy: jest.fn(),
  loadAmbientAndVoice: jest.fn().mockResolvedValue(undefined),
  loadTrigger: jest.fn().mockResolvedValue(undefined),
  startAmbient: jest.fn(),
  setAmbientGain: jest.fn(),
  startTriggerScheduler: jest.fn(),
  stopTriggerScheduler: jest.fn(),
  setTriggerPeakGain: jest.fn(),
  setIntervalRange: jest.fn(),
  setBurstDuration: jest.fn(),
  onSpike: jest.fn(),
  onNormalized: jest.fn(),
  playVoiceClip: jest.fn().mockResolvedValue(undefined),
  pauseAll: jest.fn().mockResolvedValue(undefined),
  resumeAll: jest.fn().mockResolvedValue(undefined),
  fadeOutAll: jest.fn(),
  currentTriggerGain: 0.5,
  isBurstActive: false,
};

jest.mock("@/lib/audio/audio-engine", () => ({
  AudioEngine: jest.fn(() => mockEngine),
  dBToGain: jest.fn((db: number) => Math.pow(10, db / 20)),
}));
import { AudioEngine } from "@/lib/audio/audio-engine";
const MockAudioEngine = jest.mocked(AudioEngine);

describe("useAudioEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock return values after clearAllMocks.
    mockEngine.loadAmbientAndVoice.mockResolvedValue(undefined);
    mockEngine.loadTrigger.mockResolvedValue(undefined);
    mockEngine.playVoiceClip.mockResolvedValue(undefined);
    mockEngine.pauseAll.mockResolvedValue(undefined);
    mockEngine.resumeAll.mockResolvedValue(undefined);
  });

  it("creates an AudioEngine on mount", () => {
    renderHook(() => useAudioEngine());
    expect(MockAudioEngine).toHaveBeenCalledTimes(1);
  });

  it("calls destroy() on unmount", () => {
    const { unmount } = renderHook(() => useAudioEngine());
    unmount();
    expect(mockEngine.destroy).toHaveBeenCalledTimes(1);
  });

  it("does not create a second engine on re-render", () => {
    const { rerender } = renderHook(() => useAudioEngine());
    rerender({});
    expect(MockAudioEngine).toHaveBeenCalledTimes(1);
  });

  it("returns the same API object on re-render", () => {
    const { result, rerender } = renderHook(() => useAudioEngine());
    const firstResult = result.current;

    rerender({});

    expect(result.current).toBe(firstResult);
  });

  it("delegates loadAmbientAndVoice to the engine", async () => {
    const { result } = renderHook(() => useAudioEngine());
    await act(() => result.current.loadAmbientAndVoice(1, [2, 3]));
    expect(mockEngine.loadAmbientAndVoice).toHaveBeenCalledWith(1, [2, 3]);
  });

  it("delegates loadTrigger to the engine", async () => {
    const { result } = renderHook(() => useAudioEngine());
    await act(() => result.current.loadTrigger(42));
    expect(mockEngine.loadTrigger).toHaveBeenCalledWith(42);
  });

  it("delegates startAmbient to the engine", () => {
    const { result } = renderHook(() => useAudioEngine());
    act(() => result.current.startAmbient());
    expect(mockEngine.startAmbient).toHaveBeenCalled();
  });

  it("delegates setAmbientGain to the engine", () => {
    const { result } = renderHook(() => useAudioEngine());
    act(() => result.current.setAmbientGain(0.7));
    expect(mockEngine.setAmbientGain).toHaveBeenCalledWith(0.7);
  });

  it("delegates setTriggerPeakGain to the engine", () => {
    const { result } = renderHook(() => useAudioEngine());
    act(() => result.current.setTriggerPeakGain(0.8));
    expect(mockEngine.setTriggerPeakGain).toHaveBeenCalledWith(0.8);
  });

  it("delegates setIntervalRange to the engine", () => {
    const { result } = renderHook(() => useAudioEngine());
    act(() => result.current.setIntervalRange(10000, 30000));
    expect(mockEngine.setIntervalRange).toHaveBeenCalledWith(10000, 30000);
  });

  it("delegates setBurstDuration to the engine", () => {
    const { result } = renderHook(() => useAudioEngine());
    act(() => result.current.setBurstDuration(5000));
    expect(mockEngine.setBurstDuration).toHaveBeenCalledWith(5000);
  });

  it("delegates playVoiceClip to the engine", async () => {
    const { result } = renderHook(() => useAudioEngine());
    await act(() => result.current.playVoiceClip(1));
    expect(mockEngine.playVoiceClip).toHaveBeenCalledWith(1);
  });

  it("delegates startTriggerScheduler to the engine", () => {
    const { result } = renderHook(() => useAudioEngine());
    const config = {
      intervalMinMs: 15000, intervalMaxMs: 45000,
      burstDurationMs: 8000, fadeInMs: 1500, fadeOutMs: 1500, peakGain: 1,
    };
    act(() => result.current.startTriggerScheduler(config));
    expect(mockEngine.startTriggerScheduler).toHaveBeenCalledWith(config);
  });

  it("delegates stopTriggerScheduler to the engine", () => {
    const { result } = renderHook(() => useAudioEngine());
    act(() => result.current.stopTriggerScheduler());
    expect(mockEngine.stopTriggerScheduler).toHaveBeenCalled();
  });

  it("delegates onSpike and onNormalized to the engine", () => {
    const { result } = renderHook(() => useAudioEngine());
    act(() => result.current.onSpike());
    act(() => result.current.onNormalized());
    expect(mockEngine.onSpike).toHaveBeenCalled();
    expect(mockEngine.onNormalized).toHaveBeenCalled();
  });

  it("delegates pauseAll and resumeAll to the engine", async () => {
    const { result } = renderHook(() => useAudioEngine());
    await act(() => result.current.pauseAll());
    await act(() => result.current.resumeAll());
    expect(mockEngine.pauseAll).toHaveBeenCalled();
    expect(mockEngine.resumeAll).toHaveBeenCalled();
  });

  it("delegates fadeOutAll to the engine", () => {
    const { result } = renderHook(() => useAudioEngine());
    act(() => result.current.fadeOutAll(3));
    expect(mockEngine.fadeOutAll).toHaveBeenCalledWith(3);
  });

  it("currentTriggerGain reads from the engine property", () => {
    const { result } = renderHook(() => useAudioEngine());
    expect(result.current.currentTriggerGain()).toBe(0.5);
  });

  it("isBurstActive reads from the engine property", () => {
    const { result } = renderHook(() => useAudioEngine());
    expect(result.current.isBurstActive()).toBe(false);
  });

  it("currentTriggerGain returns 0 when engine ref is null (defensive)", () => {
    // Simulate the edge case where engineRef.current is null after destroy.
    const { result, unmount } = renderHook(() => useAudioEngine());
    unmount();
    // After unmount engineRef.current is null; the getter falls back to 0.
    expect(result.current.currentTriggerGain()).toBe(0);
  });

  it("isBurstActive returns false when engine ref is null (defensive)", () => {
    const { result, unmount } = renderHook(() => useAudioEngine());
    unmount();
    expect(result.current.isBurstActive()).toBe(false);
  });
});
