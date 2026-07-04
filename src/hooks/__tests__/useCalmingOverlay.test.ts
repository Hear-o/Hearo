// Mocks have to be declared before the import that pulls audio-session in.
jest.mock("@/lib/audio/audio-session", () => ({
  activateAudioSession: jest.fn().mockResolvedValue(true),
  audioSessionReady: Promise.resolve(),
}));

import { renderHook } from "@testing-library/react-native";

import * as audioApi from "../../../test/mocks/react-native-audio-api";
import { useCalmingOverlay } from "@/hooks/useCalmingOverlay";

const flush = () =>
  new Promise<void>((resolve) => setImmediate(() => resolve()));

describe("useCalmingOverlay", () => {
  beforeEach(() => {
    audioApi.__reset();
  });

  it("decodes the calming track and starts a looping source", async () => {
    renderHook(() => useCalmingOverlay());
    // Resume + decode are async — let the microtask queue drain before asserting.
    await flush();
    await flush();
    const c = audioApi.__lastContext();
    expect(c.decodeAudioData).toHaveBeenCalledTimes(1);
    expect(c.createGain).toHaveBeenCalledTimes(1);
    expect(c.createBufferSource).toHaveBeenCalledTimes(1);
    const src = c.sources[0];
    expect(src.loop).toBe(true);
    expect(src.start).toHaveBeenCalledWith(0);
  });

  it("stops the source + closes the context on unmount", async () => {
    const { unmount } = renderHook(() => useCalmingOverlay());
    await flush();
    await flush();
    const c = audioApi.__lastContext();
    unmount();
    expect(c.sources[0].stop).toHaveBeenCalled();
    expect(c.close).toHaveBeenCalled();
  });

  it("tears down cleanly if unmount fires before decode finishes", async () => {
    const { unmount } = renderHook(() => useCalmingOverlay());
    unmount(); // before any microtask drains
    await flush();
    await flush();
    // No source should have started (the cancelled flag short-circuits before
    // createBufferSource). The context that was opened gets closed either way.
    const c = audioApi.__lastContext();
    expect(c.createBufferSource).not.toHaveBeenCalled();
    expect(c.close).toHaveBeenCalled();
  });
});
