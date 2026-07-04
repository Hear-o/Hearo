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
      style={[
        {
          color: tokens.sceneText,
          fontFamily: fonts.display,
          fontSize: 26,
          lineHeight: 36,
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
