import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { PostSessionFeedback, FeedbackAnswers } from "@/components/features/post-session";
import { SceneBackground } from "@/components/features/session/SceneBackground";
import { VoiceLine } from "@/components/features/session/VoiceLine";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import {
  getScene,
  getVoiceClips,
  getVoiceScript,
  isPlaceholderSource,
  SceneKey,
} from "@/lib/content/content";
import { fonts, tokens } from "@/lib/ui/tokens";

const VALID_SCENES: SceneKey[] = ["beach", "park", "cafe", "road"];

// Time between mount and starting the wind-down voice. Lines up with the
// 3-second ambient fade in engine.fadeOutAll(), with a 200ms cushion.
const VOICE_DELAY_MS = 3_200;

/** End-of-session transition screen (v1.1.0).
 *
 *  Previously the wind-down narration played on the session screen itself
 *  before the feedback overlay took over. The user asked for a distinct
 *  transition moment between the active session and the feedback form, so
 *  this screen now owns:
 *  1. Cross-fade ambient to silence (engine.fadeOutAll).
 *  2. Play the wind-down voice clip over the still scene background.
 *  3. When the voice finishes, render the feedback form in-place.
 *  4. On submit/skip → /after.
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
  const [voiceDone, setVoiceDone] = useState(false);

  // Closing voice script for the visible caption while the audio plays.
  const closingText = getVoiceScript(scene, "calming", i18n.language);

  useEffect(() => {
    let cancelled = false;
    let voiceTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    // Step 1: ramp ambient + trigger to silence (300ms trigger, 3s ambient).
    engine.fadeOutAll(3);

    // Step 2: after the fade completes, play the wind-down voice clip.
    voiceTimer = setTimeout(() => {
      if (cancelled) return;
      const voiceClips = getVoiceClips(scene, i18n.language);
      const windDownClip = voiceClips[2];

      if (isPlaceholderSource(windDownClip.source)) {
        // No recorded voice for this scene/lang — short pause then show feedback.
        fallbackTimer = setTimeout(() => {
          if (!cancelled) setVoiceDone(true);
        }, 800);
        return;
      }

      engine
        .playVoiceClip(2)
        .then(() => {
          if (!cancelled) setVoiceDone(true);
        })
        .catch(() => {
          if (!cancelled) setVoiceDone(true);
        });
    }, VOICE_DELAY_MS);

    return () => {
      cancelled = true;
      if (voiceTimer) clearTimeout(voiceTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [engine, scene, i18n.language]);

  const handleFeedbackSubmit = useCallback(
    (_answers: FeedbackAnswers) => {
      // TODO(supabase): persist answers to sessions feedback table.
      router.replace("/after");
    },
    [router],
  );

  const handleFeedbackSkip = useCallback(() => {
    router.replace("/after");
  }, [router]);

  // Once the voice finishes (or there was no voice to play), swap the
  // narration view for the inline feedback form.
  if (voiceDone) {
    return (
      <PostSessionFeedback
        onSubmit={handleFeedbackSubmit}
        onSkip={handleFeedbackSkip}
      />
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {/* No back-swipe out of the wind-down — this is the closing moment of
          the session; the user moves forward to feedback, not backward to
          a halfway-ended session. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
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

        <VoiceLine text={closingText} />
      </View>
    </View>
  );
}
