import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { FadeScreen } from "@/components/common/FadeScreen";
import { BreathingCircle } from "@/components/features/session/BreathingCircle";
import { SceneBackground } from "@/components/features/session/SceneBackground";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { ensureAssets, AssetManifest } from "@/lib/audio/asset-cache";
import {
  getAmbientTrack,
  getVoiceClips,
  isPlaceholderSource,
  SceneKey,
  SCENE_ORDER,
} from "@/lib/content/content";
import { fonts, tokens } from "@/lib/ui/tokens";

// All Practice scenes are valid — derive from SCENE_ORDER so v1.2.0 scenes
// don't fall back to the default (which rendered the wrong scene image/audio).
const VALID_SCENES: readonly SceneKey[] = SCENE_ORDER;

// Minimum time the user sees the preparing screen, even if prep finishes
// faster. Without this, on bundled-asset builds the cache step is a no-op
// and we'd flash through to /session — janky. With it, the user gets a
// brief, calming beat to settle before the session starts.
const MIN_DISPLAY_MS = 1500;

/** Pre-session loading screen.
 *
 *  Sits between Home (or /psychoed) and /session. Responsible for:
 *  - Asset cache verification (bundled today, CDN tomorrow).
 *  - iOS audio session activation (via useAudioEngine's load entry point).
 *  - Decoding the ambient + voice buffers into the singleton AudioEngine.
 *
 *  When prep is done AND the minimum-display window has elapsed, replaces to
 *  /session, where startAmbient + the disclaimer voice fire instantly because
 *  the buffers are already in the engine. The engine is held by the
 *  audio-engine-host singleton so it survives the route transition. */
export default function Preparing() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { scene: sceneParam } = useLocalSearchParams<{ scene?: string }>();
  const scene: SceneKey = VALID_SCENES.includes(sceneParam as SceneKey)
    ? (sceneParam as SceneKey)
    : "park";

  const engine = useAudioEngine();
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const ambientTrack = getAmbientTrack(scene);
        const voiceClips = getVoiceClips(scene, i18n.language);

        // 1. Asset cache (CDN URLs only — bundled require()s are already on device).
        const manifest: AssetManifest = [
          ...(typeof ambientTrack.source === "string" && !isPlaceholderSource(ambientTrack.source)
            ? [{ key: ambientTrack.key, url: ambientTrack.source, sha256: ambientTrack.sha256 ?? "" }]
            : []),
          ...voiceClips
            .filter((c) => typeof c.source === "string" && !isPlaceholderSource(c.source))
            .map((c) => ({ key: c.key, url: c.source as string, sha256: c.sha256 ?? "" })),
        ];
        if (manifest.length > 0) {
          await ensureAssets(manifest);
        }

        // 2. Audio session activation + buffer decode. The engine's load
        //    method does both (it awaits activateAudioSession() in the hook).
        const voiceSources = voiceClips
          .filter((c) => !isPlaceholderSource(c.source))
          .map((c) => c.source as number | string);
        const ambientSource = isPlaceholderSource(ambientTrack.source)
          ? 0
          : (ambientTrack.source as number | string);
        await engine.loadAmbientAndVoice(ambientSource, voiceSources);

        // 3. Minimum-display delay so we don't flash. Subtract elapsed prep
        //    time so users with slow networks don't double-wait.
        const elapsed = Date.now() - startedAt.current;
        const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
        if (remaining > 0) {
          await new Promise((r) => setTimeout(r, remaining));
        }

        if (!cancelled) {
          router.replace({ pathname: "/session", params: { scene } });
        }
      } catch {
        if (!cancelled) {
          setError(t("preparing.error"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [engine, scene, i18n.language, router, t]);

  return (
    <FadeScreen>
    <View className="flex-1 bg-bg">
      {/* No back-swipe while we're decoding buffers + activating the audio
          session. Interrupting prep mid-flow puts the engine in a weird
          partial state; the user proceeds forward or hits the OS home button. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <SceneBackground scene={scene} intensity={0.78} />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <View style={{ marginBottom: 40 }}>
          <BreathingCircle slow paused={false} flash={0} />
        </View>

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
          {t("preparing.eyebrow")}
        </Text>

        <Text
          style={{
            color: tokens.sceneText,
            fontFamily: fonts.display,
            fontSize: 24,
            lineHeight: 32,
            textAlign: "center",
            maxWidth: 280,
          }}
        >
          {error ?? t("preparing.body")}
        </Text>
      </View>
    </View>
    </FadeScreen>
  );
}
