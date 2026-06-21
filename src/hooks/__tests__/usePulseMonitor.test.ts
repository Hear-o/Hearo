import { renderHook, act } from "@testing-library/react-native";
import { usePulseMonitor, SessionState, PulseMonitorResult } from "@/hooks/usePulseMonitor";

// Control the BPM value the hook sees without running the real pulse logic.
jest.mock("@/lib/integrations/pulse", () => ({
  usePulse: jest.fn(),
}));
import { usePulse } from "@/lib/integrations/pulse";
const mockUsePulse = jest.mocked(usePulse);

function setPulse(value: number, source: "mock" | "real" = "mock") {
  mockUsePulse.mockReturnValue({ value, source });
}

// Spike-detection tests must run against a "real" pulse source. With "mock"
// (the default), usePulseMonitor short-circuits the spike-detection effect —
// see usePulseMonitor.ts for the why (mock generator parks the user above
// the spike threshold permanently and there's no normalize path).
function setRealPulse(value: number) {
  setPulse(value, "real");
}

interface HookOptions {
  sessionState: SessionState;
  isSessionActive: boolean;
  onSpike: jest.Mock;
  onNormalized: jest.Mock;
  onWatchDisconnected: jest.Mock;
  onWatchReconnected: jest.Mock;
}

function makeOptions(sessionState: SessionState = "LOADING"): HookOptions {
  return {
    sessionState,
    isSessionActive: true,
    onSpike: jest.fn(),
    onNormalized: jest.fn(),
    onWatchDisconnected: jest.fn(),
    onWatchReconnected: jest.fn(),
  };
}

describe("usePulseMonitor", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setPulse(74);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ── Baseline ─────────────────────────────────────────────────────────────

  it("collects baseline readings during AMBIENT_FADE_IN and locks on ADAPTIVE_LOOP entry", () => {
    setPulse(80);
    const opts = makeOptions("AMBIENT_FADE_IN");

    const { result, rerender } = renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    // Advance enough for several 250 ms sample ticks to fire.
    act(() => { jest.advanceTimersByTime(1000); });

    // Transition to ADAPTIVE_LOOP — baseline should lock to ~80.
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    expect(result.current.sessionBaseline).toBeCloseTo(80, 0);
  });

  it("falls back to 74 BPM baseline when AMBIENT_FADE_IN produced no readings", () => {
    setPulse(74);
    const opts = makeOptions("LOADING");

    const { result, rerender } = renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    // Jump straight to ADAPTIVE_LOOP without going through AMBIENT_FADE_IN.
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    expect(result.current.sessionBaseline).toBe(74);
  });

  // ── Spike detection ───────────────────────────────────────────────────────

  it("does NOT emit spike before 8 s of sustained elevation", () => {
    // Establish baseline of ~80 BPM → spike threshold = 80 * 1.15 = 92.
    setPulse(80);
    const opts = makeOptions("AMBIENT_FADE_IN");

    const { rerender } = renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    act(() => { jest.advanceTimersByTime(1000); });
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    // Raise HR above threshold.
    setPulse(92);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    // Advance to just under 8 s.
    act(() => { jest.advanceTimersByTime(7999); });
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    expect(opts.onSpike).not.toHaveBeenCalled();
  });

  it("emits spike after 8 s of sustained elevation", () => {
    setRealPulse(80);
    const opts = makeOptions("AMBIENT_FADE_IN");

    const { result, rerender } = renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    act(() => { jest.advanceTimersByTime(1000); });
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    // Raise HR above threshold — effect fires, records spikeStartedAt.
    setRealPulse(92);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    // Advance 8 s, then deliver a new BPM tick (jitter as in production) so
    // the effect re-runs and can observe that 8 s have elapsed.
    act(() => { jest.advanceTimersByTime(8000); });
    setRealPulse(93);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    expect(opts.onSpike).toHaveBeenCalledTimes(1);
    expect(result.current.isSpiked).toBe(true);
  });

  it("normalization clears isSpiked and calls onNormalized", () => {
    setRealPulse(80);
    const opts = makeOptions("AMBIENT_FADE_IN");

    const { result, rerender } = renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    act(() => { jest.advanceTimersByTime(1000); });
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    // Trigger spike (need a BPM tick after 8 s to re-run the effect).
    setRealPulse(92);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });
    act(() => { jest.advanceTimersByTime(8000); });
    setRealPulse(93);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });
    expect(opts.onSpike).toHaveBeenCalledTimes(1);

    // Drop below normalize threshold: 80 * 0.90 = 72.
    setRealPulse(71);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    expect(opts.onNormalized).toHaveBeenCalledTimes(1);
    expect(result.current.isSpiked).toBe(false);
  });

  it("re-emits spike after normalization if HR elevates again for 8 s", () => {
    setRealPulse(80);
    const opts = makeOptions("AMBIENT_FADE_IN");

    const { rerender } = renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    act(() => { jest.advanceTimersByTime(1000); });
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    // First spike cycle.
    setRealPulse(92);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });
    act(() => { jest.advanceTimersByTime(8000); });
    setRealPulse(93);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    // Normalize.
    setRealPulse(71);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    // Second spike cycle.
    setRealPulse(92);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });
    act(() => { jest.advanceTimersByTime(8000); });
    setRealPulse(93);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    expect(opts.onSpike).toHaveBeenCalledTimes(2);
  });

  // ── Chronic high baseline ─────────────────────────────────────────────────

  it("does NOT spike on HR alone when baseline > 90 (chronic high baseline)", () => {
    // Baseline of 95 BPM (chronic high).
    setPulse(95);
    const opts = makeOptions("AMBIENT_FADE_IN");

    const { rerender } = renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    act(() => { jest.advanceTimersByTime(1000); });
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    // HR above threshold: 95 * 1.15 ≈ 109.
    setPulse(110);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });
    act(() => { jest.advanceTimersByTime(8000); });
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    // Without manual distress, spike must NOT fire for chronic-high users.
    expect(opts.onSpike).not.toHaveBeenCalled();
  });

  it("spikes for chronic high baseline when reportManualDistress is also called", () => {
    setRealPulse(95);
    const opts = makeOptions("AMBIENT_FADE_IN");

    const { result, rerender } = renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    act(() => { jest.advanceTimersByTime(1000); });
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    // HR above threshold.
    setRealPulse(110);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });
    act(() => { jest.advanceTimersByTime(8000); });
    setRealPulse(111);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });
    expect(opts.onSpike).not.toHaveBeenCalled();

    // Manual distress provides the second source.
    act(() => { result.current.reportManualDistress(); });
    // New BPM tick causes the spike-detection effect to re-run and complete the dual-source check.
    setRealPulse(112);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    expect(opts.onSpike).toHaveBeenCalledTimes(1);
  });

  // ── Baseline already-locked guard ────────────────────────────────────────

  it("does not re-lock the baseline when ADAPTIVE_LOOP is entered a second time", () => {
    setPulse(80);
    const opts = makeOptions("AMBIENT_FADE_IN");

    const { result, rerender } = renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    act(() => { jest.advanceTimersByTime(1000); });
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });
    const firstBaseline = result.current.sessionBaseline;

    // Return to a non-ADAPTIVE_LOOP state then re-enter.
    rerender({ ...opts, sessionState: "WIND_DOWN" });
    setPulse(100); // different BPM — should NOT affect stored baseline
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    expect(result.current.sessionBaseline).toBe(firstBaseline);
  });

  // ── reportManualDistress edge cases ──────────────────────────────────────

  it("reportManualDistress is a no-op before baseline is established", () => {
    setPulse(95);
    const opts = makeOptions("LOADING");

    const { result } = renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    // Calling before any ADAPTIVE_LOOP entry means sessionBaselineRef is null.
    act(() => { result.current.reportManualDistress(); });

    expect(opts.onSpike).not.toHaveBeenCalled();
  });

  it("reportManualDistress is a no-op when baseline is not chronic high", () => {
    setPulse(74);
    const opts = makeOptions("AMBIENT_FADE_IN");

    const { result, rerender } = renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    act(() => { jest.advanceTimersByTime(1000); });
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    // Baseline is 74 (not chronic high). Manual distress should have no effect.
    act(() => { result.current.reportManualDistress(); });

    expect(opts.onSpike).not.toHaveBeenCalled();
  });

  it("reportManualDistress does not set pending distress when HR is below threshold", () => {
    // Chronic high baseline of 95 BPM, but current HR is below the threshold.
    setPulse(95);
    const opts = makeOptions("AMBIENT_FADE_IN");

    const { result, rerender } = renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    act(() => { jest.advanceTimersByTime(1000); });
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    // Drop HR below spike threshold before calling manual distress.
    setPulse(80); // 95 * 1.15 = 109 threshold — 80 is below it
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });
    act(() => { result.current.reportManualDistress(); });

    // Advance and tick — spike must not fire because HR was below threshold at press time.
    act(() => { jest.advanceTimersByTime(8000); });
    setPulse(81);
    rerender({ ...opts, sessionState: "ADAPTIVE_LOOP" });

    expect(opts.onSpike).not.toHaveBeenCalled();
  });

  // ── BLE disconnect ────────────────────────────────────────────────────────

  it("calls onWatchDisconnected after 8 s without a new BPM reading", () => {
    setPulse(74);
    const opts = makeOptions("AMBIENT_FADE_IN");

    renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    // Advance 8 s without any BPM change (no re-render = no new rawBpm value).
    act(() => { jest.advanceTimersByTime(8000); });

    expect(opts.onWatchDisconnected).toHaveBeenCalledTimes(1);
  });

  it("calls onWatchReconnected and restores watchConnected when BPM resumes", () => {
    setPulse(74);
    const opts = makeOptions("AMBIENT_FADE_IN");

    const { result, rerender } = renderHook<PulseMonitorResult, HookOptions>(
      (props) => usePulseMonitor(props),
      { initialProps: opts }
    );

    // Let BLE timeout fire.
    act(() => { jest.advanceTimersByTime(8000); });
    expect(result.current.watchConnected).toBe(false);

    // New BPM reading arrives — reconnect.
    setPulse(75);
    rerender({ ...opts, sessionState: "AMBIENT_FADE_IN" });

    expect(opts.onWatchReconnected).toHaveBeenCalledTimes(1);
    expect(result.current.watchConnected).toBe(true);
  });
});
