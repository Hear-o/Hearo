import { useEffect } from "react";
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
export const FADE_DURATION_MS = 600;

/** Mount-only fade-in, 0→1 over FADE_DURATION_MS. For page-level screens: an
 *  incoming screen can only fade itself in — the outgoing one is unmounted
 *  instantly by the navigator, so a true cross-screen crossfade isn't
 *  achievable without wrapping the whole navigator (out of scope). */
export function useFadeIn() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: FADE_DURATION_MS });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

/** True sequential crossfade for in-place content swaps: fades the current
 *  content out, runs `update` (e.g. a state change) once it's invisible, then
 *  fades the new content in. Each leg is half of FADE_DURATION_MS so the full
 *  round-trip matches the page-level fade-in's wall-clock duration. */
export function useCrossfade() {
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  function transition(update: () => void) {
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
  }

  return { animatedStyle, transition };
}
