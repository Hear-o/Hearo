// `mock`-prefixed so Jest allows it inside the hoisted factory. A getter keeps
// the value dynamic — displayName.ts reads Device.deviceName at call time.
let mockDeviceName: string | null = null;

jest.mock("expo-device", () => ({
  get deviceName() {
    return mockDeviceName;
  },
}));

jest.mock("@/lib/storage/storage", () => ({
  getDisplayName: jest.fn(),
  setDisplayName: jest.fn(),
}));

// Override the global no-op useFocusEffect mock from test/setup.ts so we can
// drive the focus-refresh branch (lines 95-103 of displayName.ts) under test.
// React's effect machinery runs the callback synchronously in renderHook.
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = jest.requireActual("react");
    React.useEffect(() => cb(), [cb]);
  },
}));

import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  parseDisplayNameFromDevice,
  persistDisplayName,
  resolveDisplayName,
  useDisplayName,
  useNameDraft,
} from "@/lib/ui/displayName";
import { getDisplayName, setDisplayName } from "@/lib/storage/storage";

const mockGet = getDisplayName as jest.Mock;
const mockSet = setDisplayName as jest.Mock;

describe("parseDisplayNameFromDevice", () => {
  it.each<[string | null, null]>([
    [null, null],
    ["", null],
    ["   ", null],
    ["iPhone", null],
    ["iPhone (2)", null],
    ["iPad", null],
    ["Android", null],
    ["My iPhone", null],
  ])("returns null for generic/empty input %p", (input, expected) => {
    expect(parseDisplayNameFromDevice(input)).toBe(expected);
  });

  it("parses an English possessive (straight apostrophe)", () => {
    expect(parseDisplayNameFromDevice("Omer's iPhone")).toBe("Omer");
  });

  it("parses an English possessive (curly apostrophe)", () => {
    expect(parseDisplayNameFromDevice("Omer’s iPhone")).toBe("Omer");
  });

  it("parses Hebrew with the device word before the name", () => {
    expect(parseDisplayNameFromDevice("אייפון של עומר")).toBe("עומר");
  });

  it("parses Hebrew with the name before the device word", () => {
    expect(parseDisplayNameFromDevice("עומר של אייפון")).toBe("עומר");
  });

  it("defaults to the side after של when both sides are ambiguous", () => {
    expect(parseDisplayNameFromDevice("דנה של עומר")).toBe("עומר");
  });

  it("returns null for an unparseable name", () => {
    expect(parseDisplayNameFromDevice("Galaxy S10")).toBeNull();
  });
});

describe("resolveDisplayName", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockSet.mockResolvedValue(undefined);
    mockDeviceName = null;
  });

  it("returns the cached value without consulting the device", async () => {
    mockGet.mockResolvedValue("Cached");
    expect(await resolveDisplayName()).toBe("Cached");
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("returns a cached null without re-resolving", async () => {
    mockGet.mockResolvedValue(null);
    expect(await resolveDisplayName()).toBeNull();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("resolves from the device and caches the result on a miss", async () => {
    mockGet.mockResolvedValue(undefined);
    mockDeviceName = "Omer's iPhone";
    expect(await resolveDisplayName()).toBe("Omer");
    expect(mockSet).toHaveBeenCalledWith("Omer");
  });

  it("caches null when the device name is generic", async () => {
    mockGet.mockResolvedValue(undefined);
    mockDeviceName = "iPhone";
    expect(await resolveDisplayName()).toBeNull();
    expect(mockSet).toHaveBeenCalledWith(null);
  });

  it("caches null when the OS reports no device name at all", async () => {
    mockGet.mockResolvedValue(undefined);
    mockDeviceName = null;
    expect(await resolveDisplayName()).toBeNull();
    expect(mockSet).toHaveBeenCalledWith(null);
  });
});

describe("useDisplayName", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockSet.mockResolvedValue(undefined);
    mockDeviceName = null;
  });

  it("starts loading, then settles on the resolved name", async () => {
    mockGet.mockResolvedValue("Cached");
    const { result } = renderHook(() => useDisplayName());
    expect(result.current).toEqual({ name: null, loading: true });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.name).toBe("Cached");
  });

  it("settles on null when no name is available", async () => {
    mockGet.mockResolvedValue(null);
    const { result } = renderHook(() => useDisplayName());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.name).toBeNull();
  });

  it("refreshes from storage on focus (covers the focus effect)", async () => {
    // Both the mount effect's resolveDisplayName + the focus effect call
    // getDisplayName. They share the same mock, so a single resolved value
    // covers both — "New" simulates the user having just typed it in Setup.
    mockGet.mockResolvedValue("New");
    const { result } = renderHook(() => useDisplayName());
    await waitFor(() => expect(result.current.name).toBe("New"));
    // Mount + focus both read storage — at least 2 calls.
    expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("ignores undefined from storage on focus refresh", async () => {
    // First mount call returns "Set"; second (focus) returns undefined,
    // which must NOT clear the name.
    mockGet
      .mockResolvedValueOnce("Set")
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useDisplayName());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.name).toBe("Set");
  });

  it("falls back to null and clears loading when the initial resolve rejects", async () => {
    // A storage/device-read failure must not leave `loading` stuck true forever.
    mockGet.mockRejectedValue(new Error("storage unavailable"));
    const { result } = renderHook(() => useDisplayName());
    expect(result.current).toEqual({ name: null, loading: true });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.name).toBeNull();
  });

  it("keeps the existing name when the focus-refresh read rejects", async () => {
    // Mount resolves "Set"; the focus-effect's own getDisplayName call then
    // rejects — that failure must be swallowed, not clear the stored name.
    mockGet
      .mockResolvedValueOnce("Set")
      .mockRejectedValueOnce(new Error("storage unavailable"));
    const { result } = renderHook(() => useDisplayName());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.name).toBe("Set");
  });

  it("ignores a resolve that lands after unmount", async () => {
    // Covers the `if (!active) return` guards in the mount effect's .then
    // and the focus effect's .then — an unmount before either promise
    // settles must not touch the (now-gone) store update path.
    let resolveGet!: (v: string | undefined) => void;
    mockGet.mockReturnValue(new Promise((r) => (resolveGet = r)));
    const { unmount } = renderHook(() => useDisplayName());
    unmount();
    await act(async () => {
      resolveGet("Late");
      await Promise.resolve();
    });
    // No assertion beyond "didn't throw" — the point is the guarded no-op.
  });

  it("ignores a rejection that lands after unmount", async () => {
    // Covers the `if (active)` guards in the mount effect's .catch/.finally
    // being false — an unmount before the resolve rejects must not touch
    // the store either.
    let rejectGet!: (e: Error) => void;
    mockGet.mockReturnValue(new Promise((_, r) => (rejectGet = r)));
    const { unmount } = renderHook(() => useDisplayName());
    unmount();
    await act(async () => {
      rejectGet(new Error("storage unavailable"));
      await Promise.resolve().then(() => Promise.resolve());
    });
  });

  it("reflects a save from an unrelated hook instance live, with no focus event", async () => {
    // Reproduces the reported bug: Settings is an always-mounted overlay,
    // not a routed screen, so closing it never fires a focus event on
    // Home's own useDisplayName instance. Two independent renderHook
    // instances stand in for "Home" and "Settings" here — saving through
    // one must update the other purely via the shared store, without
    // either instance's own focus effect firing.
    mockGet.mockResolvedValue(null);
    const home = renderHook(() => useDisplayName());
    await waitFor(() => expect(home.result.current.loading).toBe(false));
    expect(home.result.current.name).toBeNull();

    await act(async () => {
      await persistDisplayName("Dana");
    });

    expect(home.result.current.name).toBe("Dana");
  });
});

describe("useNameDraft", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockSet.mockResolvedValue(undefined);
    mockDeviceName = null;
  });

  it("pre-fills the draft from the resolved stored name", async () => {
    mockGet.mockResolvedValue("Omer");
    const { result } = renderHook(() => useNameDraft());
    await waitFor(() => expect(result.current.value).toBe("Omer"));
  });

  it("persists the current draft on blur", async () => {
    mockGet.mockResolvedValue(null);
    const { result } = renderHook(() => useNameDraft());
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    act(() => result.current.onChangeText("Dana"));
    await waitFor(() => expect(result.current.value).toBe("Dana"));

    act(() => result.current.onBlur());
    await waitFor(() => expect(mockSet).toHaveBeenCalledWith("Dana"));
  });

  it("swallows a rejected save on blur instead of throwing", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockRejectedValue(new Error("storage unavailable"));
    const { result } = renderHook(() => useNameDraft());
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    act(() => result.current.onChangeText("Dana"));
    await waitFor(() => expect(result.current.value).toBe("Dana"));

    expect(() => result.current.onBlur()).not.toThrow();
    await waitFor(() => expect(mockSet).toHaveBeenCalledWith("Dana"));
    // The typed value survives locally even though the write failed.
    expect(result.current.value).toBe("Dana");
  });
});

describe("persistDisplayName", () => {
  beforeEach(() => {
    mockSet.mockReset();
    mockSet.mockResolvedValue(undefined);
  });

  it("stores a trimmed value", async () => {
    await persistDisplayName("  Omer  ");
    expect(mockSet).toHaveBeenCalledWith("Omer");
  });

  it("clears the name on empty / whitespace / null", async () => {
    await persistDisplayName("");
    await persistDisplayName("   ");
    await persistDisplayName(null);
    expect(mockSet).toHaveBeenNthCalledWith(1, null);
    expect(mockSet).toHaveBeenNthCalledWith(2, null);
    expect(mockSet).toHaveBeenNthCalledWith(3, null);
  });
});
