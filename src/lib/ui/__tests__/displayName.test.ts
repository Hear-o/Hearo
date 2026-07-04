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

import { renderHook, waitFor } from "@testing-library/react-native";

import {
  parseDisplayNameFromDevice,
  persistDisplayName,
  resolveDisplayName,
  useDisplayName,
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
