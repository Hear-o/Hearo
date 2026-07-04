// Mock the Gesture.Pan builder so the test can capture the onEnd callback
// and drive it with synthetic pan events. `mock`-prefixed names are allowed
// inside the hoisted jest.mock factory.
const mockCapturedHandlers: { onEnd?: (event: { translationX: number }) => void } = {};

jest.mock("react-native-gesture-handler", () => {
  const builder: {
    minDistance: jest.Mock;
    onEnd: jest.Mock;
    runOnJS: jest.Mock;
  } = {
    minDistance: jest.fn(() => builder),
    onEnd: jest.fn((cb) => {
      mockCapturedHandlers.onEnd = cb;
      return builder;
    }),
    runOnJS: jest.fn(() => builder),
  };
  return {
    Gesture: { Pan: jest.fn(() => builder) },
    __builder: builder,
  };
});

// Pull the same builder out for assertion calls.
const { __builder: mockBuilder } = jest.requireMock("react-native-gesture-handler");

import { renderHook } from "@testing-library/react-native";

import {
  SWIPE_FORWARD_THRESHOLD_PX,
  useSwipeForward,
} from "@/hooks/useSwipeForward";

describe("useSwipeForward", () => {
  beforeEach(() => {
    mockCapturedHandlers.onEnd = undefined;
    mockBuilder.minDistance.mockClear();
    mockBuilder.onEnd.mockClear();
    mockBuilder.runOnJS.mockClear();
  });

  it("fires onForward when a swipe exceeds the threshold (positive)", () => {
    const onForward = jest.fn();
    renderHook(() => useSwipeForward(onForward));
    mockCapturedHandlers.onEnd!({ translationX: SWIPE_FORWARD_THRESHOLD_PX });
    expect(onForward).toHaveBeenCalledTimes(1);
  });

  it("fires onForward on a negative swipe past the threshold (RTL / back direction)", () => {
    const onForward = jest.fn();
    renderHook(() => useSwipeForward(onForward));
    mockCapturedHandlers.onEnd!({ translationX: -SWIPE_FORWARD_THRESHOLD_PX - 5 });
    expect(onForward).toHaveBeenCalledTimes(1);
  });

  it("does not fire onForward below the threshold", () => {
    const onForward = jest.fn();
    renderHook(() => useSwipeForward(onForward));
    mockCapturedHandlers.onEnd!({ translationX: SWIPE_FORWARD_THRESHOLD_PX - 1 });
    expect(onForward).not.toHaveBeenCalled();
  });

  it("configures the Pan gesture with minDistance + runOnJS", () => {
    renderHook(() => useSwipeForward(jest.fn()));
    expect(mockBuilder.minDistance).toHaveBeenCalledWith(SWIPE_FORWARD_THRESHOLD_PX);
    expect(mockBuilder.runOnJS).toHaveBeenCalledWith(true);
  });
});
