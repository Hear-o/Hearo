import { renderHook, act } from "@testing-library/react-native";
import { usePulse } from "@/lib/integrations/pulse";

// Mock the HealthKit seam so we can drive both the mock path (isAvailable→false,
// the default) and the real-HR path (isAvailable→true + injected samples).
jest.mock("@/lib/integrations/healthKit", () => ({
  isAvailable: jest.fn(),
  subscribeHeartRate: jest.fn(),
}));
import * as healthKit from "@/lib/integrations/healthKit";

const mockIsAvailable = jest.mocked(healthKit.isAvailable);
const mockSubscribe = jest.mocked(healthKit.subscribeHeartRate);

describe("usePulse", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // (0.5 - 0.5) * JITTER = 0 → deterministic, jitter-free movement.
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    // Default: no real HR source, so the hook uses its mock generator.
    mockIsAvailable.mockResolvedValue(false);
    mockSubscribe.mockReturnValue(() => {});
  });

  afterEach(() => {
    // Discard (don't fire) any interval left pending — firing it would trigger
    // a setState after the hook has been torn down, outside act().
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("starts at the baseline target", () => {
    const { result } = renderHook(() =>
      usePulse({ active: true, phase: "baseline" }),
    );
    expect(result.current.value).toBe(74);
    expect(result.current.source).toBe("mock");
  });

  it("does not change while inactive", () => {
    const { result } = renderHook(() =>
      usePulse({ active: false, phase: "peak" }),
    );
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.value).toBe(74);
  });

  it("rises toward the peak target over time when active", () => {
    const { result } = renderHook(() =>
      usePulse({ active: true, phase: "peak" }),
    );
    act(() => {
      jest.advanceTimersByTime(2200); // ~10 ticks @ 220ms
    });
    expect(result.current.value).toBeGreaterThan(74);
    expect(result.current.value).toBeLessThanOrEqual(112);
  });

  it("clamps the value within [58, 130]", () => {
    const { result } = renderHook(() =>
      usePulse({ active: true, phase: "peak" }),
    );
    act(() => {
      jest.advanceTimersByTime(60000);
    });
    expect(result.current.value).toBeGreaterThanOrEqual(58);
    expect(result.current.value).toBeLessThanOrEqual(130);
  });

  it("clears its interval on unmount", () => {
    const clearSpy = jest.spyOn(global, "clearInterval");
    const { unmount } = renderHook(() =>
      usePulse({ active: true, phase: "rising" }),
    );
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });

  describe("real HR source", () => {
    it("switches to the real source when HealthKit is available", async () => {
      mockIsAvailable.mockResolvedValue(true);
      let emit: (s: { bpm: number; timestamp: number }) => void = () => {};
      mockSubscribe.mockImplementation((cb) => {
        emit = cb;
        return () => {};
      });

      const { result } = renderHook(() =>
        usePulse({ active: true, phase: "baseline" }),
      );
      // Flush the mount effect's `await healthKit.isAvailable()`.
      await act(async () => {});

      expect(result.current.source).toBe("real");

      act(() => emit({ bpm: 91, timestamp: Date.now() }));
      expect(result.current.value).toBe(91);
    });

    it("falls back to mock after REAL_SILENCE_MS without a real sample", async () => {
      mockIsAvailable.mockResolvedValue(true);
      let emit: (s: { bpm: number; timestamp: number }) => void = () => {};
      mockSubscribe.mockImplementation((cb) => {
        emit = cb;
        return () => {};
      });

      const { result } = renderHook(() =>
        usePulse({ active: true, phase: "baseline" }),
      );
      await act(async () => {});
      act(() => emit({ bpm: 100, timestamp: Date.now() }));
      expect(result.current.source).toBe("real");

      // No further samples for > 10s: the mock loop detects the silence and
      // downgrades the source so the auto-soften logic can read it.
      act(() => {
        jest.advanceTimersByTime(11000);
      });
      expect(result.current.source).toBe("mock");
    });

    it("unsubscribes from HealthKit on unmount", async () => {
      mockIsAvailable.mockResolvedValue(true);
      const unsubscribe = jest.fn();
      mockSubscribe.mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() =>
        usePulse({ active: true, phase: "baseline" }),
      );
      await act(async () => {});
      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
