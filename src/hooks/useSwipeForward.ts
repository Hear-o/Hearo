import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";

/** Distance (px) a horizontal pan must cover to count as a swipe-forward
 *  rather than a stray drag. Tuned so tap targets inside the screen still
 *  fire normally — the threshold is well past a typical finger jitter. */
export const SWIPE_FORWARD_THRESHOLD_PX = 60;

/** Build a Pan gesture that fires `onForward()` whenever the user does a
 *  horizontal swipe of at least SWIPE_FORWARD_THRESHOLD_PX in either
 *  direction. Used on every screen with a "Continue" / "Begin" / "Ready" /
 *  "Done" action so the user can swipe through the app instead of tapping.
 *
 *  Direction-agnostic on purpose: it works the same in LTR English and RTL
 *  Hebrew without a per-locale flip. Tap-on-button still works because
 *  Pressables sit inside the GestureDetector and the minDistance threshold
 *  prevents accidental gesture activation on a stationary tap.
 *
 *  Usage:
 *    const swipe = useSwipeForward(handleContinue);
 *    return <GestureDetector gesture={swipe}>{...screen}</GestureDetector>; */
export function useSwipeForward(onForward: () => void) {
  return useMemo(
    () =>
      Gesture.Pan()
        .minDistance(SWIPE_FORWARD_THRESHOLD_PX)
        .onEnd((event) => {
          if (Math.abs(event.translationX) >= SWIPE_FORWARD_THRESHOLD_PX) {
            onForward();
          }
        })
        .runOnJS(true),
    [onForward],
  );
}
