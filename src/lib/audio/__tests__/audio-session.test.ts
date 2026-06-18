// Integration test for the iOS audio-session activation path.
//
// This is the one piece of the audio subsystem that talks directly to the
// native AVAudioSession (via react-native-audio-api's `AudioManager`). The
// engine unit suite never touches it, and the `useAudioEngine` unit suite
// stubs the engine out entirely — so the app ↔ native session boundary has no
// behavioral coverage. This file fills that gap.
//
// `audio-session.ts` configures the category at module import, then activates
// explicitly at first I/O. To drive each scenario we re-import the module
// inside `jest.isolateModules` with a per-test `AudioManager` double.

const EXPECTED_OPTIONS = {
  iosCategory: "playback",
  iosMode: "default",
  iosOptions: [],
} as const;

interface AudioSessionModule {
  audioSessionReady: Promise<void>;
  activateAudioSession: () => Promise<boolean>;
}

/** A controllable `AudioManager` double plus the spies, mirroring the three
 *  native calls `configureAudioSession` makes. `activate` lets a test make the
 *  native setActive call reject (interruption / partially-linked build). */
function makeAudioManager(
  activate: () => Promise<void> = async () => {},
) {
  const setAudioSessionOptions = jest.fn();
  const observeAudioInterruptions = jest.fn();
  const setAudioSessionActivity = jest.fn(activate);
  return {
    AudioManager: {
      setAudioSessionOptions,
      observeAudioInterruptions,
      setAudioSessionActivity,
    },
    setAudioSessionOptions,
    observeAudioInterruptions,
    setAudioSessionActivity,
  };
}

/** Import a fresh copy of audio-session.ts against `manager`. Category setup
 *  fires synchronously during `require`; activation remains explicit. */
function importWithManager(
  manager: ReturnType<typeof makeAudioManager>,
): AudioSessionModule {
  let session: AudioSessionModule | undefined;
  jest.isolateModules(() => {
    jest.doMock("react-native-audio-api", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const base = require("../../../../test/mocks/react-native-audio-api");
      return { ...base, AudioManager: manager.AudioManager };
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    session = require("@/lib/audio/audio-session") as AudioSessionModule;
  });
  if (!session) throw new Error("audio session module did not load");
  return session;
}

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("iOS audio-session configuration and activation", () => {
  it("configures playback without invalid category options", () => {
    const mgr = makeAudioManager();
    importWithManager(mgr);

    expect(mgr.setAudioSessionOptions).toHaveBeenCalledTimes(1);
    expect(mgr.setAudioSessionOptions).toHaveBeenCalledWith(EXPECTED_OPTIONS);
  });

  it("registers the interruption observer so audio recovers after calls/Siri", () => {
    const mgr = makeAudioManager();
    importWithManager(mgr);

    expect(mgr.observeAudioInterruptions).toHaveBeenCalledWith(true);
  });

  it("defers activation until explicitly requested", async () => {
    const mgr = makeAudioManager();
    const session = importWithManager(mgr);

    await expect(session.audioSessionReady).resolves.toBeUndefined();
    expect(mgr.setAudioSessionActivity).not.toHaveBeenCalled();

    await expect(session.activateAudioSession()).resolves.toBe(true);
    expect(mgr.setAudioSessionActivity).toHaveBeenCalledTimes(1);
    expect(mgr.setAudioSessionActivity).toHaveBeenCalledWith(true);
  });

  it("sets the category + observer BEFORE activating (ordering is load-bearing on iOS)", async () => {
    // On iOS the session must be fully configured before setActive(YES) or the
    // first playback routes through the wrong category. invocationCallOrder is a
    // monotonic global counter, so a smaller value means "called earlier".
    const mgr = makeAudioManager();
    const session = importWithManager(mgr);
    await session.activateAudioSession();

    const optionsOrder = mgr.setAudioSessionOptions.mock.invocationCallOrder[0];
    const observeOrder = mgr.observeAudioInterruptions.mock.invocationCallOrder[0];
    const activateOrder = mgr.setAudioSessionActivity.mock.invocationCallOrder[0];

    expect(optionsOrder).toBeLessThan(activateOrder);
    expect(observeOrder).toBeLessThan(activateOrder);
  });

  it("retries and returns false without rejecting when native activation throws", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const mgr = makeAudioManager(async () => {
      throw new Error("AVAudioSession setActive failed");
    });
    const session = importWithManager(mgr);

    await expect(session.activateAudioSession()).resolves.toBe(false);
    expect(mgr.setAudioSessionActivity).toHaveBeenCalledTimes(3);
    expect(mgr.setAudioSessionActivity).toHaveBeenCalledWith(true);
  });

  it("swallows a synchronous category failure and skips the observer", () => {
    // If the very first native call throws (no native module at all), the catch
    // wraps the whole sequence: activation is never attempted, yet the promise
    // still resolves so the app keeps running on the library's default session.
    const mgr = makeAudioManager();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    mgr.setAudioSessionOptions.mockImplementation(() => {
      throw new Error("native module unavailable");
    });

    importWithManager(mgr);
    expect(mgr.observeAudioInterruptions).not.toHaveBeenCalled();
    expect(mgr.setAudioSessionActivity).not.toHaveBeenCalled();
  });
});
