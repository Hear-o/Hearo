import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/components/common/ScreenHeader";
import { Icon } from "@/components/common/Icon";
import { CalmingProtocol } from "@/components/features/calming/CalmingProtocol";
import { useRelaxationRecording } from "@/hooks/useRelaxationRecording";
import { useSessionStore } from "@/lib/storage/session-store";
import { useCrisisStore } from "@/lib/storage/crisis-store";
import { usePageFade } from "@/lib/ui/fadeTransition";
import { fonts, tokens } from "@/lib/ui/tokens";

/** Localized recording with reviewed visual guidance available at any time.
 * Completion stays here; only an explicit exit returns to the caller. */
export default function Calming() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { animatedStyle, transition } = usePageFade();
  const setLastEndedBy = useSessionStore((s) => s.setLastEndedBy);
  const [visual, setVisual] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  const isCrisisOpen = useCrisisStore((s) => s.isOpen);
  const handleGuidanceEnd = useCallback(() => {
    // Audio can finish with the screen locked. Never focus the exposure
    // session from a completion callback, including on the next foreground.
    setCompleted(true);
    setLastEndedBy("calming-protocol");
  }, [setLastEndedBy]);
  const { status, paused, resumeInterrupted, togglePause, retry } = useRelaxationRecording(
    i18n.language,
    isCrisisOpen,
    handleGuidanceEnd,
    !visual && !leaving && !completed,
  );
  const showProtocol = !completed && (visual || status === "error");
  const keepProtocol = !completed && (visual || fallback || status === "error");
  const needsRetry = status === "error" || status === "finished";
  const controlsDisabled = isCrisisOpen;
  let statusLabel = "calming.listening";
  if (completed) statusLabel = "calming.completed";
  else if (visual) statusLabel = "calming.visualGuidance";
  else if (status === "error") statusLabel = "calming.recordingError";
  else if (status === "loading") statusLabel = "calming.loadingRecording";
  else if (status === "interrupted") statusLabel = "calming.interruptedRecording";
  else if (status === "paused") statusLabel = "calming.pausedRecording";

  let actionLabel = "calming.pauseRecording";
  if (needsRetry) actionLabel = "calming.retryRecording";
  else if (isCrisisOpen) actionLabel = "calming.pausedForSupport";
  else if (status === "interrupted" || paused) actionLabel = "calming.resumeRecording";

  function handleAudioControl() {
    if (needsRetry) retryRecording();
    else if (status === "interrupted") resumeInterrupted();
    else togglePause();
  }

  function playRecording() {
    setVisual(false);
    setFallback(true);
    retry();
  }

  function retryRecording() {
    // Retain the visual step, but hide its instructions and stop its timers
    // while narration is selected. Failure restores that saved step.
    setFallback(true);
    retry();
  }

  function handleExit() {
    setLeaving(true);
    transition(() => router.back());
  }

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      <SafeAreaView className="flex-1 bg-bg">
        {/* Header — nav element (close) on the leading edge, crisis on the
            trailing edge. Same LTR/RTL convention as Setup/Home/Session. */}
        <ScreenHeader
          left={
            <Pressable hitSlop={16} onPress={handleExit} accessibilityLabel={t("calming.exit")}>
              <Icon name="close" size={22} color={tokens.text} />
            </Pressable>
          }
        />
        <View
          className={showProtocol ? "items-center px-8" : "flex-1 items-center justify-center px-8"}
          style={{ gap: showProtocol ? 12 : 24 }}
        >
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: tokens.text, fontFamily: fonts.body, fontSize: 22, textAlign: "center" }}
          >
            {t(statusLabel)}
          </Text>
          {!visual && !completed && (status === "loading" ? <ActivityIndicator color={tokens.accent} /> : (
            <Pressable
              onPress={handleAudioControl}
              disabled={controlsDisabled}
              accessibilityRole="button"
              accessibilityState={{ disabled: controlsDisabled }}
              style={{ backgroundColor: tokens.accent, borderRadius: 999, paddingVertical: 16, paddingHorizontal: 40, opacity: controlsDisabled ? 0.5 : 1 }}
            >
              <Text style={{ color: tokens.text, fontFamily: fonts.bodyMedium, fontSize: 18 }}>
                {t(actionLabel)}
              </Text>
            </Pressable>
          ))}
          {visual && !completed && (
            <Pressable
              onPress={playRecording}
              accessibilityRole="button"
              disabled={isCrisisOpen}
              accessibilityState={{ disabled: isCrisisOpen }}
              style={{ padding: 12 }}
            >
              <Text style={{ color: tokens.text, fontFamily: fonts.bodyMedium, fontSize: 17 }}>
                {t("calming.playRecording")}
              </Text>
            </Pressable>
          )}
          {!showProtocol && !completed && (
            <Pressable
              onPress={() => setVisual(true)}
              accessibilityRole="button"
              style={{ padding: 12 }}
            >
              <Text style={{ color: tokens.text, fontFamily: fonts.bodyMedium, fontSize: 17 }}>
                {t("calming.useVisualGuidance")}
              </Text>
            </Pressable>
          )}
        </View>
        {keepProtocol && <CalmingProtocol active={showProtocol} onProtocolEnd={handleGuidanceEnd} />}
        <Pressable
          onPress={handleExit}
          accessibilityRole="button"
          style={{ alignItems: "center", padding: 24 }}
        >
          <Text style={{ color: tokens.text, fontFamily: fonts.bodyMedium, fontSize: 17 }}>
            {t("calming.return")}
          </Text>
        </Pressable>
      </SafeAreaView>
    </Animated.View>
  );
}
