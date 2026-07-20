import Animated from "react-native-reanimated";

import { useFadeIn } from "@/lib/ui/fadeTransition";

/** Wraps a screen's root content in a mount fade-in. The root Stack disables
 *  its own native animation (`animation: "none"` in _layout.tsx) so this is
 *  the only thing driving page-to-page transitions — see fadeTransition.ts
 *  for why native-stack's built-in fade can't give consistent cross-platform
 *  timing. */
export function FadeScreen({ children }: { children: React.ReactNode }) {
  const animatedStyle = useFadeIn();
  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
