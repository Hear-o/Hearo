import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { PostSessionFeedback, FeedbackAnswers } from "@/components/features/post-session";
import { SceneBackground } from "@/components/features/session/SceneBackground";
import { VoiceLine } from "@/components/features/session/VoiceLine";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import {
  getScene,
  getVoiceScript,
  SceneKey,
  SCENE_ORDER,
} from "@/lib/content/content";
import { useCrossfade, usePageFade } from "@/lib/ui/fadeTransition";
import { fonts, tokens } from "@/lib/ui/tokens";

// All Practice scenes are valid — derive from SCENE_ORDER so v1.2.0 scenes
// don't fall back to the default scene on the wind-down screen.
const VALID_SCENES: readonly SceneKey[] = SCENE_ORDER;

// Time between mount and starting the wind-down voice. Lines up with the
// 3-second ambient fade in engine.fadeOutAll(), with a 200ms cushion.
const VOICE_DELAY_MS = 3_200;

/** End-of-session transition screen (v1.1.0).
 *
 *  Fades out all audio, holds on the scene for a moment, then shows the
 *  feedback form. The outro narration (voice[2]) already played during the
 *  session's OUTRO zone — this screen is purely the visual transition and
 *  feedback handoff. On submit/skip → /after.
 *
 *  Engine is the shared singleton via useAudioEngine, so the buffers loaded
 *  in /preparing are still here. We don't release the engine — /after's
 *  mount effect handles teardown after feedback. */
export default function WindingDown() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { scene: sceneParam } = useLocalSearchParams<{ scene?: string }>();
  const scene: SceneKey = VALID_SCENES.includes(sceneParam as SceneKey)
    ? (sceneParam as SceneKey)
    : "park";

  const engine = useAudioEngine();
  const { animatedStyle, transition } = usePageFade();
  // The scene → feedback swap is an in-place content change, not a route
  // change, so it gets the crossfade (fade out, swap, fade in) rather than
  // the page fade. Nested inside the page fade below.
  const { animatedStyle: swapStyle, transition: swapTransition } = useCrossfade();
  const [voiceDone, setVoiceDone] = useState(false);

  // Closing voice script for the visible caption while the audio plays.
  const closingText = getVoiceScript(scene, "calming", i18n.language);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Ramp ambient + trigger to silence (300ms trigger, 3s ambient), then
    // show the feedback form. The outro narration already played during the
    // session's OUTRO zone — nothing more to play here.
    engine.fadeOutAll(3);

    timer = setTimeout(() => {
      if (!cancelled) swapTransition(() => setVoiceDone(true));
    }, VOICE_DELAY_MS);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [engine, swapTransition]);

  const handleFeedbackSubmit = useCallback(
    (_answers: FeedbackAnswers) => {
      // TODO(supabase): persist answers to sessions feedback table.
      transition(() => router.replace("/after"));
    },
    [router, transition],
  );

  const handleFeedbackSkip = useCallback(() => {
    transition(() => router.replace("/after"));
  }, [router, transition]);

  // After the ambient fade completes, swap the scene view for the feedback form.
  if (voiceDone) {
    return (
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <Animated.View style={[{ flex: 1 }, swapStyle]}>
          <PostSessionFeedback
            onSubmit={handleFeedbackSubmit}
            onSkip={handleFeedbackSkip}
          />
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
    <Animated.View style={[{ flex: 1 }, swapStyle]}>
    <View className="flex-1 bg-bg">
      <SceneBackground scene={scene} intensity={0.86} />
      <View
        style={{
          flex: 1,
          paddingHorizontal: 32,
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: tokens.sceneText,
            fontFamily: fonts.body,
            fontSize: 13,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            opacity: 0.65,
            marginBottom: 18,
            textAlign: "center",
          }}
        >
          {t("windingDown.eyebrow")}
        </Text>

        {/* Empty for scenes without recorded narration — skip the blank line. */}
        {closingText ? <VoiceLine text={closingText} /> : null}
      </View>
    </View>
    </Animated.View>
    </Animated.View>
  );
}
