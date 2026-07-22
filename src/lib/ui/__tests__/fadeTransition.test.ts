// Override the global no-op useFocusEffect mock from test/setup.ts so
// useFadeIn's real focus-triggered fade runs under test. React's effect
// machinery runs the callback synchronously in renderHook.
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = jest.requireActual("react");
    React.useEffect(() => cb(), [cb]);
  },
}));

import { act, renderHook } from "@testing-library/react-native";
import * as Reanimated from "react-native-reanimated";

import { FADE_DURATION_MS, useCrossfade, useFadeIn, usePageFade } from "@/lib/ui/fadeTransition";

describe("useFadeIn", () => {
  it("fades in to opacity 1 over FADE_DURATION_MS on focus", () => {
    // react-native-reanimated's jest mock creates a fresh useSharedValue
    // instance on every render rather than persisting it (unlike the real
    // library), so asserting on a post-render opacity value isn't reliable
    // here — assert on the animation call itself instead.
    const spy = jest.spyOn(Reanimated, "withTiming");
    renderHook(() => useFadeIn());
    expect(spy).toHaveBeenCalledWith(1, { duration: FADE_DURATION_MS });
  });
});

describe("useCrossfade", () => {
  it("starts fully visible", () => {
    const { result } = renderHook(() => useCrossfade());
    expect(result.current.animatedStyle).toEqual({ opacity: 1 });
  });

  it("calls update once the fade-out completes", () => {
    const { result } = renderHook(() => useCrossfade());
    const update = jest.fn();

    act(() => {
      result.current.transition(update);
    });

    expect(update).toHaveBeenCalledTimes(1);
  });

  it("does not call update if the fade-out is interrupted", () => {
    // react-native-reanimated's jest mock always invokes withTiming's
    // callback with `finished: true`. Override it once here to exercise
    // the `if (finished)` guard's untaken branch.
    jest
      .spyOn(Reanimated, "withTiming")
      .mockImplementationOnce(((
        toValue: unknown,
        _config?: unknown,
        callback?: (finished: boolean) => void,
      ) => {
        callback?.(false);
        return toValue;
      }) as typeof Reanimated.withTiming);

    const { result } = renderHook(() => useCrossfade());
    const update = jest.fn();

    act(() => {
      result.current.transition(update);
    });

    expect(update).not.toHaveBeenCalled();
  });
});

describe("usePageFade", () => {
  it("fades in on focus over half FADE_DURATION_MS", () => {
    const spy = jest.spyOn(Reanimated, "withTiming");
    renderHook(() => usePageFade());
    expect(spy).toHaveBeenCalledWith(1, { duration: FADE_DURATION_MS / 2 });
  });

  it("calls the transition's update once fade-out completes", () => {
    const { result } = renderHook(() => usePageFade());
    const update = jest.fn();

    act(() => {
      result.current.transition(update);
    });

    expect(update).toHaveBeenCalledTimes(1);
  });

  it("does not call update if the fade-out is interrupted", () => {
    // Render first so the mount fade-in's own withTiming call (mocked
    // finished:true by default) doesn't consume the mockImplementationOnce
    // meant for the fade-out below.
    const { result } = renderHook(() => usePageFade());

    jest
      .spyOn(Reanimated, "withTiming")
      .mockImplementationOnce(((
        toValue: unknown,
        _config?: unknown,
        callback?: (finished: boolean) => void,
      ) => {
        callback?.(false);
        return toValue;
      }) as typeof Reanimated.withTiming);

    const update = jest.fn();

    act(() => {
      result.current.transition(update);
    });

    expect(update).not.toHaveBeenCalled();
  });
});
