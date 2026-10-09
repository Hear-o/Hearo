import { act, renderHook } from "@testing-library/react-native";
import { AppState, AppStateStatus } from "react-native";
import * as audioApi from "../../../test/mocks/react-native-audio-api";
import { activateAudioSession } from "@/lib/audio/audio-session";
import { useRelaxationRecording } from "@/hooks/useRelaxationRecording";

jest.mock("@/lib/audio/audio-log", () => ({ audioWarn: jest.fn() }));
jest.mock("@/lib/audio/audio-session", () => ({
  activateAudioSession: jest.fn().mockResolvedValue(true),
}));

// Exercise focus setup AND cleanup, including blur. The global test shim is
// intentionally a no-op, which would leave this focus-owned hook untested.
let mockFocused = true;
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = jest.requireActual<typeof import("react")>("react");
    // Focus is an explicit test input; rerender commits simulate nav events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => mockFocused ? callback() : undefined, [callback, mockFocused]);
  },
}));

const mockConfigure = jest.fn();
jest.mock("react-native-audio-api", () => {
  const fake = jest.requireActual("../../../test/mocks/react-native-audio-api");
  return {
    ...fake,
    AudioContext: class extends fake.AudioContext {
      constructor() { super(); mockConfigure(this); }
    },
  };
});

type Context = ReturnType<typeof audioApi.__lastContext>;
type Buffer = InstanceType<typeof audioApi.AudioBuffer>;
type Props = { language: string; interrupted: boolean; enabled: boolean };
const activation = jest.mocked(activateAudioSession);
const completed = jest.fn();
const contexts: Context[] = [];
let appChange: (state: AppStateStatus) => void;
const removeListener = jest.fn();

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const settle = () => act(async () => {
  await new Promise<void>((resolve) => setImmediate(resolve));
});

function mount(initial: Props = { language: "en", interrupted: false, enabled: true }) {
  return renderHook<ReturnType<typeof useRelaxationRecording>, Props>((props) => useRelaxationRecording(
    props.language, props.interrupted, completed, props.enabled,
  ), { initialProps: initial });
}

beforeEach(() => {
  mockFocused = true;
  completed.mockReset();
  contexts.length = 0;
  audioApi.__reset();
  activation.mockReset().mockResolvedValue(true);
  mockConfigure.mockReset().mockImplementation((ctx: Context) => contexts.push(ctx));
  removeListener.mockReset();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
    appChange = listener;
    return { remove: removeListener };
  });
});

afterEach(() => jest.restoreAllMocks());

it("starts suspended, decodes once, then plays a non-looping source", async () => {
  const { result } = mount();
  expect(result.current.status).toBe("loading");
  await settle();
  const ctx = contexts[0];
  expect(result.current.status).toBe("playing");
  expect(ctx.suspend.mock.invocationCallOrder[0]).toBeLessThan(ctx.decodeAudioData.mock.invocationCallOrder[0]);
  expect(ctx.decodeAudioData).toHaveBeenCalledTimes(1);
  expect(ctx.sources[0].loop).toBe(false);
  expect(ctx.sources[0].connect).toHaveBeenCalledWith(ctx.destination);
  expect(ctx.sources[0].start.mock.invocationCallOrder[0]).toBeLessThan(ctx.resume.mock.invocationCallOrder[0]);
});

it("supports the default enabled argument", async () => {
  const { result } = renderHook(() => useRelaxationRecording("en", false, completed));
  await settle();
  expect(result.current.status).toBe("playing");
});

it("pauses and resumes the same buffer without restarting narration", async () => {
  const { result } = mount();
  await settle();
  act(() => result.current.togglePause());
  await settle();
  expect(result.current.status).toBe("paused");
  expect(contexts[0].state).toBe("suspended");
  act(() => result.current.togglePause());
  await settle();
  expect(result.current.status).toBe("playing");
  expect(contexts[0].sources[0].start).toHaveBeenCalledTimes(1);
});

it("suspends for crisis support and honors a manual pause when it closes", async () => {
  const { result, rerender } = mount();
  await settle();
  rerender({ language: "en", interrupted: true, enabled: true });
  await settle();
  expect(result.current.status).toBe("paused");
  rerender({ language: "en", interrupted: false, enabled: true });
  await settle();
  expect(result.current.status).toBe("playing");
  act(() => result.current.togglePause());
  rerender({ language: "en", interrupted: true, enabled: true });
  await settle();
  rerender({ language: "en", interrupted: false, enabled: true });
  await settle();
  expect(result.current.status).toBe("paused");
});

it("does not start audible playback if crisis support is already open", async () => {
  const { result } = mount({ language: "he-IL", interrupted: true, enabled: true });
  await settle();
  expect(result.current.status).toBe("paused");
  expect(contexts[0].resume).not.toHaveBeenCalled();
});

it("respects a crisis that opens while decoding", async () => {
  const decode = deferred<Buffer>();
  mockConfigure.mockImplementation((ctx: Context) => {
    contexts.push(ctx);
    ctx.decodeAudioData.mockReturnValueOnce(decode.promise);
  });
  const { result, rerender } = mount();
  await settle();
  rerender({ language: "en", interrupted: true, enabled: true });
  decode.resolve(new audioApi.AudioBuffer());
  await settle();
  expect(result.current.status).toBe("paused");
  expect(contexts[0].resume).not.toHaveBeenCalled();
});

it("leaves running narration untouched on inactive/background/foreground, even if activation would fail", async () => {
  const { result, unmount } = mount();
  await settle();
  const count = contexts[0].suspend.mock.calls.length;
  const activated = activation.mock.calls.length;
  const resumes = contexts[0].resume.mock.calls.length;
  activation.mockResolvedValue(false);
  act(() => { appChange("inactive"); appChange("background"); });
  await settle();
  expect(contexts[0].suspend).toHaveBeenCalledTimes(count);
  expect(result.current.status).toBe("playing");
  act(() => appChange("active"));
  await settle();
  expect(activation).toHaveBeenCalledTimes(activated);
  expect(contexts[0].resume).toHaveBeenCalledTimes(resumes);
  expect(contexts[0].close).not.toHaveBeenCalled();
  expect(contexts[0].sources[0].start).toHaveBeenCalledTimes(1);
  unmount();
  expect(removeListener).toHaveBeenCalled();
});

it("never resumes after a pause arrives during activation", async () => {
  const { result } = mount();
  await settle();
  const activate = deferred<boolean>();
  activation.mockReturnValueOnce(activate.promise);
  const resumes = contexts[0].resume.mock.calls.length;
  contexts[0].state = "suspended";
  act(() => appChange("active"));
  await settle();
  act(() => result.current.togglePause());
  activate.resolve(true);
  await settle();
  expect(contexts[0].resume).toHaveBeenCalledTimes(resumes);
  expect(result.current.status).toBe("paused");
});

it("recovers a natively suspended context on foreground without restarting the source", async () => {
  const { result } = mount();
  await settle();
  const ctx = contexts[0];
  ctx.state = "suspended";
  act(() => appChange("active"));
  await settle();
  expect(ctx.state).toBe("running");
  expect(result.current.status).toBe("playing");
  expect(ctx.sources[0].start).toHaveBeenCalledTimes(1);
});

it("accepts void suspend/resume results from legacy native bridges", async () => {
  mockConfigure.mockImplementation((ctx: Context) => {
    contexts.push(ctx);
    ctx.suspend.mockImplementation(async () => {
      ctx.state = "suspended";
      return undefined as never;
    });
    ctx.resume.mockImplementation(async () => {
      ctx.state = "running";
      return undefined as never;
    });
  });
  const { result } = mount();
  await settle();
  expect(result.current.status).toBe("playing");
  act(() => result.current.togglePause());
  await settle();
  expect(result.current.status).toBe("paused");
  act(() => result.current.togglePause());
  await settle();
  expect(result.current.status).toBe("playing");
  expect(contexts[0].close).not.toHaveBeenCalled();
});

it("serializes a pending resume before the latest pause", async () => {
  const { result } = mount();
  await settle();
  const resume = deferred<boolean>();
  contexts[0].state = "suspended";
  contexts[0].resume.mockImplementationOnce(async () => {
    const ok = await resume.promise;
    contexts[0].state = "running";
    return ok;
  });
  act(() => appChange("active"));
  await settle();
  act(() => result.current.togglePause());
  resume.resolve(true);
  await settle();
  expect(contexts[0].state).toBe("suspended");
  expect(result.current.status).toBe("paused");
});

it("reports initial activation failure, then retries with a fresh attempt", async () => {
  activation.mockResolvedValueOnce(false);
  const { result } = mount();
  await settle();
  expect(result.current.status).toBe("error");
  expect(contexts).toHaveLength(0);
  act(() => result.current.retry());
  await settle();
  expect(result.current.status).toBe("playing");
  expect(contexts).toHaveLength(1);
});

it("reports decode failure and releases the failed context", async () => {
  mockConfigure.mockImplementation((ctx: Context) => {
    contexts.push(ctx);
    ctx.decodeAudioData.mockRejectedValueOnce(new Error("decode"));
  });
  const { result } = mount();
  await settle();
  expect(result.current.status).toBe("error");
  expect(contexts[0].close).toHaveBeenCalledTimes(1);
  expect(completed).not.toHaveBeenCalled();
});

it("treats false initial suspension as an error", async () => {
  mockConfigure.mockImplementation((ctx: Context) => {
    contexts.push(ctx);
    ctx.suspend.mockResolvedValueOnce(false);
  });
  const { result } = mount();
  await settle();
  expect(result.current.status).toBe("error");
  expect(contexts[0].decodeAudioData).not.toHaveBeenCalled();
});

it("treats resume activation returning false as an error and detaches completion", async () => {
  const { result } = mount();
  await settle();
  act(() => result.current.togglePause());
  await settle();
  activation.mockResolvedValueOnce(false);
  const resumes = contexts[0].resume.mock.calls.length;
  const staleEnd = contexts[0].sources[0].onEnded!;
  act(() => result.current.togglePause());
  await settle();
  expect(result.current.status).toBe("error");
  expect(contexts[0].resume).toHaveBeenCalledTimes(resumes);
  expect(contexts[0].sources[0].onEnded).toBeNull();
  expect(contexts[0].sources[0].buffer).toBeNull();
  act(() => staleEnd());
  expect(completed).not.toHaveBeenCalled();
});

it.each(["false", "reject"])("handles native resume %s", async (failure) => {
  const { result } = mount();
  await settle();
  contexts[0].state = "suspended";
  if (failure === "false") contexts[0].resume.mockResolvedValueOnce(false);
  else contexts[0].resume.mockRejectedValueOnce(new Error("resume"));
  act(() => appChange("active"));
  await settle();
  expect(result.current.status).toBe("error");
  expect(contexts[0].sources[0].onEnded).toBeNull();
});

it.each(["false", "reject"])("handles native pause %s", async (failure) => {
  const { result } = mount();
  await settle();
  if (failure === "false") contexts[0].suspend.mockResolvedValueOnce(false);
  else contexts[0].suspend.mockRejectedValueOnce(new Error("pause"));
  act(() => result.current.togglePause());
  await settle();
  expect(result.current.status).toBe("error");
  expect(contexts[0].sources[0].onEnded).toBeNull();
});

it("completion uses the latest callback, runs once, and releases the buffer", async () => {
  const newer = jest.fn();
  const { result, rerender } = renderHook<ReturnType<typeof useRelaxationRecording>, { callback: () => void }>(({ callback }) =>
    useRelaxationRecording("en", false, callback), { initialProps: { callback: completed } });
  await settle();
  rerender({ callback: newer });
  const end = contexts[0].sources[0].onEnded!;
  act(() => { end(); end(); });
  expect(newer).toHaveBeenCalledTimes(1);
  expect(completed).not.toHaveBeenCalled();
  expect(result.current.status).toBe("finished");
  expect(contexts[0].sources[0].buffer).toBeNull();
});

it("retries from a manual pause with a fresh context and unpaused intent", async () => {
  const { result } = mount();
  await settle();
  act(() => result.current.togglePause());
  await settle();
  act(() => result.current.retry());
  await settle();
  expect(result.current.paused).toBe(false);
  expect(result.current.status).toBe("playing");
  expect(contexts).toHaveLength(2);
  expect(contexts[0].close).toHaveBeenCalledTimes(1);
});

it("stops and frees playback when disabled for visual guidance", async () => {
  const { rerender } = mount();
  await settle();
  rerender({ language: "en", interrupted: false, enabled: false });
  expect(contexts[0].sources[0].stop).toHaveBeenCalled();
  expect(contexts[0].sources[0].onEnded).toBeNull();
  expect(contexts[0].sources[0].buffer).toBeNull();
  act(() => appChange("active"));
  await settle();
  expect(completed).not.toHaveBeenCalled();
});

it("does not create audio while disabled, then plays when enabled", async () => {
  const { result, rerender } = mount({ language: "en", interrupted: false, enabled: false });
  await settle();
  expect(contexts).toHaveLength(0);
  rerender({ language: "en", interrupted: false, enabled: true });
  await settle();
  expect(result.current.status).toBe("playing");
});

it("tears down on blur and creates a fresh attempt on focus", async () => {
  const { result, rerender } = mount();
  await settle();
  mockFocused = false;
  rerender({ language: "en", interrupted: false, enabled: true });
  expect(contexts[0].close).toHaveBeenCalledTimes(1);
  mockFocused = true;
  rerender({ language: "en", interrupted: false, enabled: true });
  await settle();
  expect(contexts).toHaveLength(2);
  expect(result.current.status).toBe("playing");
});

it("switches locale but does not restart for regional variants of the same locale", async () => {
  const { result, rerender } = mount();
  await settle();
  rerender({ language: "he-IL", interrupted: false, enabled: true });
  await settle();
  expect(contexts[0].close).toHaveBeenCalledTimes(1);
  expect(contexts).toHaveLength(2);
  expect(result.current.status).toBe("playing");
  rerender({ language: "he", interrupted: false, enabled: true });
  await settle();
  expect(contexts).toHaveLength(2);
});

it("ignores an old pause rejection after changing language", async () => {
  const { result, rerender } = mount();
  await settle();
  const suspend = deferred<boolean>();
  contexts[0].suspend.mockReturnValueOnce(suspend.promise);
  act(() => result.current.togglePause());
  await settle();
  rerender({ language: "he", interrupted: false, enabled: true });
  await settle();
  act(() => result.current.togglePause());
  await settle();
  suspend.reject(new Error("old suspend"));
  await settle();
  expect(result.current.status).toBe("playing");
  expect(contexts[1].close).not.toHaveBeenCalled();
});

it("ignores an old resume rejection after retry", async () => {
  const { result } = mount();
  await settle();
  const resume = deferred<boolean>();
  contexts[0].state = "suspended";
  contexts[0].resume.mockReturnValueOnce(resume.promise);
  act(() => appChange("active"));
  await settle();
  act(() => result.current.retry());
  await settle();
  resume.reject(new Error("old resume"));
  await settle();
  expect(result.current.status).toBe("playing");
  expect(contexts[1].close).not.toHaveBeenCalled();
});

it("cancels before initial activation finishes", async () => {
  const activate = deferred<boolean>();
  activation.mockReturnValueOnce(activate.promise);
  const { unmount } = mount();
  unmount();
  activate.resolve(true);
  await settle();
  expect(contexts).toHaveLength(0);
});

it("cancels while initial suspension is pending", async () => {
  const suspend = deferred<boolean>();
  mockConfigure.mockImplementation((ctx: Context) => {
    contexts.push(ctx);
    ctx.suspend.mockReturnValueOnce(suspend.promise);
  });
  const { unmount } = mount();
  await settle();
  unmount();
  suspend.resolve(true);
  await settle();
  expect(contexts[0].decodeAudioData).not.toHaveBeenCalled();
  expect(contexts[0].close).toHaveBeenCalledTimes(1);
});

it.each(["resolve", "reject"])("ignores cancelled decode %s", async (outcome) => {
  const decode = deferred<Buffer>();
  mockConfigure.mockImplementation((ctx: Context) => {
    contexts.push(ctx);
    ctx.decodeAudioData.mockReturnValueOnce(decode.promise);
  });
  const { unmount } = mount();
  await settle();
  unmount();
  if (outcome === "resolve") decode.resolve(new audioApi.AudioBuffer());
  else decode.reject(new Error("cancelled decode"));
  await settle();
  expect(contexts[0].createBufferSource).not.toHaveBeenCalled();
  expect(contexts[0].close).toHaveBeenCalledTimes(1);
  expect(completed).not.toHaveBeenCalled();
});

it("ignores activation that finishes after its playback attempt is replaced", async () => {
  const { result } = mount();
  await settle();
  const activate = deferred<boolean>();
  contexts[0].state = "suspended";
  activation.mockReturnValueOnce(activate.promise);
  act(() => appChange("active"));
  await settle();
  act(() => result.current.retry());
  await settle();
  activate.resolve(false);
  await settle();
  expect(result.current.status).toBe("playing");
});

it("ignores a successful pause that settles after its attempt is replaced", async () => {
  const { result } = mount();
  await settle();
  const suspend = deferred<boolean>();
  contexts[0].suspend.mockReturnValueOnce(suspend.promise);
  act(() => result.current.togglePause());
  await settle();
  act(() => result.current.retry());
  await settle();
  suspend.resolve(true);
  await settle();
  expect(result.current.status).toBe("playing");
});

it("still cleans up if stopping or closing fails, without completing", async () => {
  const { unmount } = mount();
  await settle();
  const ctx = contexts[0];
  ctx.sources[0].stop.mockImplementationOnce(() => { throw new Error("stop"); });
  ctx.close.mockImplementationOnce(() => Promise.reject(new Error("close")) as never);
  unmount();
  await settle();
  expect(ctx.sources[0].onEnded).toBeNull();
  expect(ctx.sources[0].buffer).toBeNull();
  expect(completed).not.toHaveBeenCalled();
});

it("cleans up a node whose start throws", async () => {
  mockConfigure.mockImplementation((ctx: Context) => {
    contexts.push(ctx);
    const create = ctx.createBufferSource.getMockImplementation()!;
    ctx.createBufferSource.mockImplementationOnce(() => {
      const node = create();
      node.start.mockImplementationOnce(() => { throw new Error("start"); });
      return node;
    });
  });
  const { result } = mount();
  await settle();
  expect(result.current.status).toBe("error");
  expect(contexts[0].sources[0].onEnded).toBeNull();
});

it.each([false, true])("requires explicit recovery after interruption ended with shouldResume=%s", async (shouldResume) => {
  const { result } = mount();
  await settle();
  const ctx = contexts[0];
  act(() => audioApi.__emitInterruption({ type: "began", shouldResume: false }));
  expect(result.current.interruptionActive).toBe(true);
  await settle();
  expect(result.current.status).toBe("interrupted");
  act(() => audioApi.__emitInterruption({ type: "ended", shouldResume }));
  await settle();
  // Reproduce a misleading per-context state after the shared engine paused.
  ctx.state = "running";
  const activations = activation.mock.calls.length;
  act(() => appChange("active"));
  await settle();
  expect(result.current.status).toBe("interrupted");
  expect(activation).toHaveBeenCalledTimes(activations);
  expect(result.current.interruptionActive).toBe(false);
  act(() => result.current.resumeInterrupted());
  await settle();
  expect(result.current.status).toBe("playing");
  expect(ctx.sources[0].start).toHaveBeenCalledTimes(1);
  expect(ctx.decodeAudioData).toHaveBeenCalledTimes(1);
  expect(ctx.close).not.toHaveBeenCalled();
});

it("recovers in place when began has no matching ended event", async () => {
  const { result } = mount();
  await settle();
  act(() => audioApi.__emitInterruption({ type: "began", shouldResume: false }));
  await settle();
  act(() => appChange("active"));
  await settle();
  expect(result.current.status).toBe("interrupted");
  act(() => result.current.resumeInterrupted());
  await settle();
  expect(result.current.interruptionActive).toBe(false);
  expect(result.current.status).toBe("playing");
  expect(contexts[0].sources[0].start).toHaveBeenCalledTimes(1);
  expect(contexts[0].decodeAudioData).toHaveBeenCalledTimes(1);
});

it("shows fallback error if explicit recovery without ended cannot activate", async () => {
  const { result } = mount();
  await settle();
  act(() => audioApi.__emitInterruption({ type: "began", shouldResume: false }));
  await settle();
  activation.mockResolvedValueOnce(false);
  act(() => result.current.resumeInterrupted());
  await settle();
  expect(result.current.status).toBe("error");
  expect(contexts[0].sources[0].onEnded).toBeNull();
});

it("handles an ended event without began and rejects failed forced recovery", async () => {
  const { result } = mount();
  await settle();
  act(() => audioApi.__emitInterruption({ type: "ended", shouldResume: false }));
  await settle();
  contexts[0].suspend.mockResolvedValueOnce(false);
  act(() => result.current.resumeInterrupted());
  await settle();
  expect(result.current.status).toBe("error");
  expect(contexts[0].sources[0].onEnded).toBeNull();
});

it("latches interruption during decode and resumes only on explicit choice", async () => {
  const decode = deferred<Buffer>();
  mockConfigure.mockImplementation((ctx: Context) => {
    contexts.push(ctx);
    ctx.decodeAudioData.mockReturnValueOnce(decode.promise);
  });
  const { result } = mount();
  await settle();
  act(() => audioApi.__emitInterruption({ type: "ended", shouldResume: false }));
  decode.resolve(new audioApi.AudioBuffer());
  await settle();
  expect(result.current.status).toBe("interrupted");
  expect(contexts[0].resume).not.toHaveBeenCalled();
  act(() => result.current.resumeInterrupted());
  await settle();
  expect(result.current.status).toBe("playing");
});

it("does not resume if an interruption arrives during activation", async () => {
  const { result } = mount();
  await settle();
  const activate = deferred<boolean>();
  activation.mockReturnValueOnce(activate.promise);
  contexts[0].state = "suspended";
  act(() => appChange("active"));
  await settle();
  const resumes = contexts[0].resume.mock.calls.length;
  act(() => audioApi.__emitInterruption({ type: "ended", shouldResume: false }));
  activate.resolve(true);
  await settle();
  expect(result.current.status).toBe("interrupted");
  expect(contexts[0].resume).toHaveBeenCalledTimes(resumes);
});

it("settles interrupted when an interruption arrives during pending native resume", async () => {
  const { result } = mount();
  await settle();
  const resume = deferred<boolean>();
  contexts[0].state = "suspended";
  contexts[0].resume.mockReturnValueOnce(resume.promise);
  act(() => appChange("active"));
  await settle();
  act(() => audioApi.__emitInterruption({ type: "ended", shouldResume: false }));
  resume.resolve(true);
  await settle();
  expect(result.current.status).toBe("interrupted");
  expect(contexts[0].state).toBe("suspended");
});

it("ignores a removed listener and recovery action after unmount", async () => {
  const { result, unmount } = mount();
  await settle();
  const calls = audioApi.AudioManager.addSystemEventListener.mock.calls;
  const staleListener = calls[calls.length - 1][1];
  const recover = result.current.resumeInterrupted;
  const ctx = contexts[0];
  unmount();
  act(() => {
    staleListener({ type: "ended", shouldResume: false });
    recover();
    audioApi.__emitInterruption({ type: "began", shouldResume: false });
  });
  await settle();
  expect(ctx.close).toHaveBeenCalledTimes(1);
  expect(completed).not.toHaveBeenCalled();
});

it("defers explicit interruption recovery while crisis support remains open", async () => {
  const { result, rerender } = mount();
  await settle();
  act(() => audioApi.__emitInterruption({ type: "ended", shouldResume: false }));
  await settle();
  rerender({ language: "en", interrupted: true, enabled: true });
  act(() => result.current.resumeInterrupted());
  await settle();
  expect(result.current.status).toBe("paused");
  rerender({ language: "en", interrupted: false, enabled: true });
  await settle();
  expect(result.current.status).toBe("playing");
});
