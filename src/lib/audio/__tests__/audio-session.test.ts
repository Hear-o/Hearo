// Integration test for the iOS audio-session activation path.
//
// This is the one piece of the audio subsystem that talks directly to the
// native AVAudioSession (via react-native-audio-api's `AudioManager`). The
// engine unit suite never touches it, and the `useAudioEngine` unit suite
// stubs the engine out entirely — so the app ↔ native session boundary has no
// behavioral coverage. This file fills that gap.
//
// `audio-session.ts` runs its side effect (`configureAudioSession`) once, at
// module import, and exposes the in-flight promise as `audioSessionReady`. To
// drive each scenario we re-import the module inside `jest.isolateModules`
// with a per-test `AudioManager` double, so we own the spies and get a fresh
// `audioSessionReady` every time. (The global mock in test/setup.ts handles
// the *other* suites that import this module transitively; here we override it
// so we can assert ordering and exercise the native-failure branch.)

const EXPECTED_OPTIONS = {
  iosCategory: "playback",
  iosMode: "default",
  iosOptions: ["allowBluetoothA2DP", "allowAirPlay"],
} as const;

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

/** Import a fresh copy of audio-session.ts against `manager`, returning the
 *  resolved `audioSessionReady` promise. The synchronous AudioManager calls
 *  fire during `require`; we await activation before handing back. */
async function importWithManager(
  manager: ReturnType<typeof makeAudioManager>,
): Promise<void> {
  let ready: Promise<void> | undefined;
  jest.isolateModules(() => {
    jest.doMock("react-native-audio-api", () => ({
      AudioManager: manager.AudioManager,
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ready = require("@/lib/audio/audio-session").audioSessionReady as Promise<void>;
  });
  await ready;
}

beforeEach(() => {
  jest.resetModules();
});

describe("audioSessionReady / iOS session activation", () => {
  it("configures the playback category with Bluetooth + AirPlay routing", async () => {
    const mgr = makeAudioManager();
    await importWithManager(mgr);

    expect(mgr.setAudioSessionOptions).toHaveBeenCalledTimes(1);
    expect(mgr.setAudioSessionOptions).toHaveBeenCalledWith(EXPECTED_OPTIONS);
  });

  it("registers the interruption observer so audio recovers after calls/Siri", async () => {
    const mgr = makeAudioManager();
    await importWithManager(mgr);

    expect(mgr.observeAudioInterruptions).toHaveBeenCalledWith(true);
  });

  it("activates the AVAudioSession and resolves audioSessionReady", async () => {
    const mgr = makeAudioManager();
    await expect(importWithManager(mgr)).resolves.toBeUndefined();

    expect(mgr.setAudioSessionActivity).toHaveBeenCalledTimes(1);
    expect(mgr.setAudioSessionActivity).toHaveBeenCalledWith(true);
  });

  it("sets the category + observer BEFORE activating (ordering is load-bearing on iOS)", async () => {
    // On iOS the session must be fully configured before setActive(YES) or the
    // first playback routes through the wrong category. invocationCallOrder is a
    // monotonic global counter, so a smaller value means "called earlier".
    const mgr = makeAudioManager();
    await importWithManager(mgr);

    const optionsOrder = mgr.setAudioSessionOptions.mock.invocationCallOrder[0];
    const observeOrder = mgr.observeAudioInterruptions.mock.invocationCallOrder[0];
    const activateOrder = mgr.setAudioSessionActivity.mock.invocationCallOrder[0];

    expect(optionsOrder).toBeLessThan(activateOrder);
    expect(observeOrder).toBeLessThan(activateOrder);
  });

  it("never rejects when native activation throws (interruption / unlinked build)", async () => {
    // A partially-linked dev build or a native bridge error must not produce an
    // unhandled rejection — consumers `await audioSessionReady` before every
    // playback path, so a rejection here would break loading on every screen.
    const mgr = makeAudioManager(async () => {
      throw new Error("AVAudioSession setActive failed");
    });

    await expect(importWithManager(mgr)).resolves.toBeUndefined();
    expect(mgr.setAudioSessionActivity).toHaveBeenCalledWith(true);
  });

  it("swallows a synchronous AudioManager failure and skips the rest of setup", async () => {
    // If the very first native call throws (no native module at all), the catch
    // wraps the whole sequence: activation is never attempted, yet the promise
    // still resolves so the app keeps running on the library's default session.
    const mgr = makeAudioManager();
    mgr.setAudioSessionOptions.mockImplementation(() => {
      throw new Error("native module unavailable");
    });

    await expect(importWithManager(mgr)).resolves.toBeUndefined();
    expect(mgr.observeAudioInterruptions).not.toHaveBeenCalled();
    expect(mgr.setAudioSessionActivity).not.toHaveBeenCalled();
  });
});
