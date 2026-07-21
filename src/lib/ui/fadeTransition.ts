import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// Single source of truth for how long a fade transition takes, app-wide.
// Native-stack's own `animation`/`animationDuration` can't give us this:
// `animationDuration` is iOS-only (Android's native-stack fade duration is
// baked into internal animation-resource files with no public override), so
// every screen-to-screen transition and in-screen step transition instead
// goes through this shared Reanimated-driven fade for identical timing on
// both platforms. See FadeScreen.tsx (page-level) and screening.tsx's
// useCrossfade() usage (in-screen step swaps).
export const FADE_DURATION_MS = 1000;

/** Fade-in, 0→1 over FADE_DURATION_MS, replayed on every focus — not just
 *  first mount. React Navigation keeps popped-to screens mounted, so a plain
 *  mount-only effect only fires on the initial push; navigating *back* to an
 *  already-mounted screen would otherwise snap into view with no fade at
 *  all. useFocusEffect covers both the initial push and every subsequent
 *  return to this screen. For page-level screens: an incoming screen can
 *  only fade itself in — the outgoing one is unmounted/hidden instantly by
 *  the navigator, so a true cross-screen crossfade isn't achievable without
 *  wrapping the whole navigator (out of scope). */
export function useFadeIn() {
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = 0;
      opacity.value = withTiming(1, { duration: FADE_DURATION_MS });
      // opacity is a Reanimated shared value (stable identity) — adding it
      // here trips react-hooks/immutability instead (mutating a value
      // listed as a dependency), which is worse than this warning.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

/** True sequential crossfade for in-place content swaps: fades the current
 *  content out, runs `update` (e.g. a state change) once it's invisible, then
 *  fades the new content in. Each leg is half of FADE_DURATION_MS so the full
 *  round-trip matches the page-level fade-in's wall-clock duration. */
export function useCrossfade() {
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const transition = useCallback(
    (update: () => void) => {
      opacity.value = withTiming(
        0,
        { duration: FADE_DURATION_MS / 2 },
        (finished) => {
          if (finished) {
            runOnJS(update)();
            opacity.value = withTiming(1, { duration: FADE_DURATION_MS / 2 });
          }
        },
      );
    },
    [opacity],
  );

  return { animatedStyle, transition };
}
