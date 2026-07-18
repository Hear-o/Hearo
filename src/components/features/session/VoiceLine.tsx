import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { fonts, tokens } from "@/lib/ui/tokens";

type Props = {
  text: string;
};

export function VoiceLine({ text }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 8;
    opacity.value = withTiming(1, { duration: 900 });
    translateY.value = withTiming(0, { duration: 900 });
  }, [text, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text
      // Shrink to fit the fixed caption box if a line would overflow, so long
      // narration never pushes the breathing circle below it.
      adjustsFontSizeToFit
      numberOfLines={4}
      minimumFontScale={0.7}
      style={[
        {
          color: tokens.sceneText,
          fontFamily: fonts.display,
          fontSize: 30,
          lineHeight: 40,
          // v1.1.10: textAlign:"left" is the reading-start convention —
          // under Fabric's RTL mirror, "left" renders visual right (Hebrew
          // reading direction) and stays visual left in LTR.
          textAlign: "left" as const,
        },
        style,
      ]}
    >
      {text}
    </Animated.Text>
  );
}
