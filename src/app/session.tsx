import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { BreathingCircle } from "@/components/features/session/BreathingCircle";
import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";
import { Icon } from "@/components/common/Icon";
import { SceneBackground } from "@/components/features/session/SceneBackground";
import { VoiceLine } from "@/components/features/session/VoiceLine";
import { useSessionStore } from "@/lib/storage/session-store";
import { getScene, getVoiceScript, localize, SceneKey, isPlaceholderSource, getAmbientTrack, getVoiceClips, getSound } from "@/lib/content/content";
import { dBToGain } from "@/lib/audio/audio-engine";
import { audioTrace, audioWarn } from "@/lib/audio/audio-log";
import { useCrisisStore } from "@/lib/storage/crisis-store";
import { fonts, tokens } from "@/lib/ui/tokens";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { usePulseMonitor, SessionState } from "@/hooks/usePulseMonitor";
import { ensureAssets, AssetManifest } from "@/lib/audio/asset-cache";
import { PostSessionFeedback, FeedbackAnswers } from "@/components/features/post-session";

// ── Constants ────────────────────────────────────────────────────────────

const VALID_SCENES: SceneKey[] = ["beach", "park", "cafe", "road"];

// Duration of AMBIENT_FADE_IN before advancing to ADAPTIVE_LOOP.
// TODO(supabase): session_programs table — per-scene timing config.
const AMBIENT_FADE_IN_MS = 2 * 60 * 1000; // 2 minutes

// Total ADAPTIVE_LOOP duration.
const ADAPTIVE_LOOP_MS = 8 * 60 * 1000; // 8 minutes

// Used by the in-session progress bar (elapsed / TOTAL_SESSION_MS).
// WIND_DOWN is a few seconds and not user-facing, so we don't include it
// in the progress bar — by the time the bar would visually fill the last
// 1%, the session has already routed to /after.
const TOTAL_SESSION_MS = AMBIENT_FADE_IN_MS + ADAPTIVE_LOOP_MS;

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// dB gain ceiling per trigger sound type (applied at slider=1.0).
// 0 dB = gain 1.0 = play at recorded level. Negative values attenuate.
// TODO(supabase): calibrate per sound key once clinical review is complete.
const TRIGGER_CEILING_DB: Record<string, number> = {
  motorcycle: 0,
  helicopter: 0,
  fireworks: 0,
  siren: 0,
  "car-horn": 0,
  "door-slam": 0,
};
const DEFAULT_CEILING_DB = 0;

// Burst scheduler defaults.
// TODO(supabase): session_programs table — per-scene/per-sound timing config.
const TRIGGER_INTERVAL_MIN_MS = 15_000; // minimum gap between bursts
const TRIGGER_INTERVAL_MAX_MS = 45_000; // maximum gap (randomized)
const TRIGGER_BURST_DURATION_MS = 8_000; // time at peak gain per burst
const TRIGGER_FADE_IN_MS = 1_500;        // onset ramp
const TRIGGER_FADE_OUT_MS = 1_500;       // offset ramp

// Manual distress auto-return after 90 seconds (no watch / watch disconnected).
const MANUAL_RETURN_MS = 90_000;

// ── Session state machine ─────────────────────────────────────────────────

type MachineState = SessionState;

type Action =
  | { type: "ASSETS_READY" }
  | { type: "DISCLAIMER_DONE" }
  | { type: "BASELINE_READY" }
  | { type: "SESSION_END" }
  | { type: "WIND_DOWN_DONE" }
  | { type: "FEEDBACK_SUBMITTED" };

function sessionReducer(state: MachineState, action: Action): MachineState {
  switch (state) {
    case "LOADING":
      if (action.type === "ASSETS_READY") return "DISCLAIMER";
      // Allow exit during download — audio has not started, skip straight to post-session.
      if (action.type === "SESSION_END") return "POST_SESSION";
      break;
    case "DISCLAIMER":
      if (action.type === "DISCLAIMER_DONE") return "AMBIENT_FADE_IN";
      // Allow exit before full audio engagement.
      if (action.type === "SESSION_END") return "POST_SESSION";
      break;
    case "AMBIENT_FADE_IN":
      if (action.type === "BASELINE_READY") return "ADAPTIVE_LOOP";
      if (action.type === "SESSION_END") return "WIND_DOWN";
      break;
    case "ADAPTIVE_LOOP":
      if (action.type === "SESSION_END") return "WIND_DOWN";
      break;
    case "WIND_DOWN":
      if (action.type === "WIND_DOWN_DONE") return "POST_SESSION";
      break;
    case "POST_SESSION":
      // Navigation handled in useEffect; FEEDBACK_SUBMITTED reserved for feedback form.
      break;
  }
  return state;
}

// ── Helpers ───────────────────────────────────────────────────────────────


// ── Component ─────────────────────────────────────────────────────────────

export default function Session() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { scene: sceneParam } = useLocalSearchParams<{ scene?: string }>();
  const scene: SceneKey = VALID_SCENES.includes(sceneParam as SceneKey)
    ? (sceneParam as SceneKey)
    : "park";

  const consentedSounds = useSessionStore((s) => s.sounds);
  const setLastEndedBy = useSessionStore((s) => s.setLastEndedBy);
  const isCrisisOpen = useCrisisStore((s) => s.isOpen);

  // ── Machine state ──────────────────────────────────────────────────────

  // /preparing now handles asset cache + buffer decode + audio activation
  // before routing here, so we skip LOADING and land directly on DISCLAIMER.
  // (LOADING is still in the state machine to support a future fallback path
  // where /session is reached without going through /preparing.)
  const [machineState, dispatch] = useReducer(sessionReducer, "DISCLAIMER");
  const machineStateRef = useRef<MachineState>("DISCLAIMER");
  useEffect(() => { machineStateRef.current = machineState; }, [machineState]);

  // ── UI state ───────────────────────────────────────────────────────────

  const [elapsed, setElapsed] = useState(0);
  // POST_SESSION: show feedback form before routing to After.
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [watchBanner, setWatchBanner] = useState<"no-watch" | "disconnected" | null>(null);
  // Manual distress countdown (seconds remaining, null when not active).
  const [manualCountdown, setManualCountdown] = useState<number | null>(null);

  const startedAt = useRef(Date.now());
  const pausedSince = useRef<number | null>(null);
  const manualReturnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCountdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  // Stores the dB ceiling for the active trigger sound. The slider used to
  // multiply this; now that the slider is gone, the ceiling is the literal
  // playback gain and no per-frame adjustment is needed.
  const triggerCeilingDbRef = useRef<number>(DEFAULT_CEILING_DB);
  // Picked once at mount so LOADING (manifest) and DISCLAIMER (buffer load) use the same variation.
  const selectedAmbientTrack = useRef(getAmbientTrack(scene));

  // ── Audio engine ───────────────────────────────────────────────────────

  const engine = useAudioEngine();

  // ── Pulse monitor ──────────────────────────────────────────────────────

  const onSpike = useCallback(() => {
    if (machineStateRef.current !== "ADAPTIVE_LOOP") return;
    engine.onSpike();
  }, [engine]);

  const onNormalized = useCallback(() => {
    engine.onNormalized();
  }, [engine]);

  const onWatchDisconnected = useCallback(() => {
    setWatchBanner("disconnected");
  }, []);

  const onWatchReconnected = useCallback(() => {
    setWatchBanner(null);
    // Clear manual countdown when watch reconnects.
    if (manualReturnTimer.current) clearTimeout(manualReturnTimer.current);
    if (manualCountdownInterval.current) clearInterval(manualCountdownInterval.current);
    setManualCountdown(null);
    // Resume trigger ramp — engine was stuck in spiked state from the manual distress press.
    engine.onNormalized();
  }, [engine]);

  const { pulseBpm, sessionBaseline, isSpiked, watchConnected, reportManualDistress } =
    usePulseMonitor({
      sessionState: machineState,
      isSessionActive: !isCrisisOpen,
      onSpike,
      onNormalized,
      onWatchDisconnected,
      onWatchReconnected,
    });

  // Show no-watch banner on first render if no watch connected.
  useEffect(() => {
    if (!watchConnected && machineState === "DISCLAIMER") {
      setWatchBanner("no-watch");
    }
  }, [watchConnected, machineState]);

  // ── Session baseline → advance to ADAPTIVE_LOOP ────────────────────────

  useEffect(() => {
    if (sessionBaseline !== null && machineState === "AMBIENT_FADE_IN") {
      dispatch({ type: "BASELINE_READY" });
    }
  }, [sessionBaseline, machineState]);

  // Fallback: if AMBIENT_FADE_IN elapses with no baseline, advance anyway.
  useEffect(() => {
    if (machineState !== "AMBIENT_FADE_IN") return;
    const id = setTimeout(() => {
      if (machineStateRef.current === "AMBIENT_FADE_IN") {
        dispatch({ type: "BASELINE_READY" });
      }
    }, AMBIENT_FADE_IN_MS);
    return () => clearTimeout(id);
  }, [machineState]);

  // ── LOADING: verify/download assets ───────────────────────────────────

  useEffect(() => {
    if (machineState !== "LOADING") return;

    const ambientTrack = selectedAmbientTrack.current;
    const voiceClips = getVoiceClips(scene, i18n.language);

    // Only include CDN assets (skip placeholders — no network call possible).
    const manifest: AssetManifest = [
      ...(!isPlaceholderSource(ambientTrack.source) && typeof ambientTrack.source === "string"
        ? [{ key: ambientTrack.key, url: ambientTrack.source, sha256: ambientTrack.sha256 ?? "" }]
        : []),
      ...voiceClips
        .filter((c) => !isPlaceholderSource(c.source) && typeof c.source === "string")
        .map((c) => ({ key: c.key, url: c.source as string, sha256: c.sha256 ?? "" })),
    ];

    (async () => {
      try {
        if (manifest.length > 0) {
          await ensureAssets(manifest, (done, total) => {
            setLoadProgress(done / total);
          });
        }
        dispatch({ type: "ASSETS_READY" });
      } catch (e) {
        setLoadError("Failed to download audio files. Check your connection and try again.");
      }
    })();
  }, [machineState]);

  // ── DISCLAIMER: load ambient + voice buffers, start ambient, play clip 0 ──

  useEffect(() => {
    if (machineState !== "DISCLAIMER") return;

    const ambientTrack = selectedAmbientTrack.current;
    const voiceClips = getVoiceClips(scene, i18n.language);
    const disclaimerClip = voiceClips[0];

    if (isPlaceholderSource(ambientTrack.source) && isPlaceholderSource(disclaimerClip.source)) {
      // No real assets yet — skip loading, advance immediately.
      dispatch({ type: "DISCLAIMER_DONE" });
      return;
    }

    const voiceSources = voiceClips
      .filter((c) => !isPlaceholderSource(c.source))
      .map((c) => c.source as number | string);

    audioTrace("session DISCLAIMER: kicking off loadAmbientAndVoice");
    engine
      .loadAmbientAndVoice(
        isPlaceholderSource(ambientTrack.source) ? 0 : (ambientTrack.source as number | string),
        voiceSources
      )
      .then(async () => {
        // startAmbient only after buffer is loaded. Await it — it's now
        // async because we explicitly wait for ctx.resume() to flip
        // suspended→running on iOS.
        if (!isPlaceholderSource(ambientTrack.source)) {
          await engine.startAmbient();
        }
        if (!isPlaceholderSource(disclaimerClip.source)) {
          return engine.playVoiceClip(0);
        }
      })
      .then(() => dispatch({ type: "DISCLAIMER_DONE" }))
      .catch((e) => {
        audioWarn("session DISCLAIMER: chain FAILED, advancing anyway", e);
        dispatch({ type: "DISCLAIMER_DONE" });
      });
  }, [machineState, engine]);

  // ── ADAPTIVE_LOOP: load trigger buffer, then start ramp ──────────────

  useEffect(() => {
    if (machineState !== "ADAPTIVE_LOOP") return;

    const sound = consentedSounds[0];
    if (!sound) {
      // Rehearsal walk — no trigger. Just start the auto-advance timer.
      const id = setTimeout(() => {
        if (machineStateRef.current === "ADAPTIVE_LOOP") {
            setLastEndedBy("natural");
            dispatch({ type: "SESSION_END" });
          }
      }, ADAPTIVE_LOOP_MS);
      return () => clearTimeout(id);
    }

    const ceilingDb = TRIGGER_CEILING_DB[sound] ?? DEFAULT_CEILING_DB;
    triggerCeilingDbRef.current = ceilingDb;
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout>;

    // Pick a random variation from the consented sound's audioVariations.
    // TODO(supabase): sounds / sound_variations table supplies these.
    const variations = getSound(sound).audioVariations as number[];
    const triggerSource = variations[Math.floor(Math.random() * variations.length)];

    engine
      .loadTrigger(triggerSource)
      .then(() => {
        if (cancelled) return;
        engine.startTriggerScheduler({
          intervalMinMs: TRIGGER_INTERVAL_MIN_MS,
          intervalMaxMs: TRIGGER_INTERVAL_MAX_MS,
          burstDurationMs: TRIGGER_BURST_DURATION_MS,
          fadeInMs: TRIGGER_FADE_IN_MS,
          fadeOutMs: TRIGGER_FADE_OUT_MS,
          peakGain: dBToGain(ceilingDb),
        });
        timerId = setTimeout(() => {
          if (machineStateRef.current === "ADAPTIVE_LOOP") {
            setLastEndedBy("natural");
            dispatch({ type: "SESSION_END" });
          }
        }, ADAPTIVE_LOOP_MS);
      })
      .catch((e) => {
        audioWarn("session ADAPTIVE_LOOP: loadTrigger FAILED, falling back to rehearsal", e);
        // Trigger failed to load — continue as rehearsal walk.
        if (!cancelled) {
          timerId = setTimeout(() => {
            if (machineStateRef.current === "ADAPTIVE_LOOP") {
            setLastEndedBy("natural");
            dispatch({ type: "SESSION_END" });
          }
          }, ADAPTIVE_LOOP_MS);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [machineState, consentedSounds, engine]);

  // MID_SESSION voice clip at 50% elapsed.
  const midSessionFiredRef = useRef(false);
  useEffect(() => {
    if (machineState !== "ADAPTIVE_LOOP" || midSessionFiredRef.current) return;
    const halfMs = ADAPTIVE_LOOP_MS / 2;
    const id = setTimeout(() => {
      midSessionFiredRef.current = true;
      const voiceClips = getVoiceClips(scene, i18n.language);
      if (!isPlaceholderSource(voiceClips[1].source)) {
        engine.playVoiceClip(1).catch((e) => {
          audioWarn("session MID_SESSION: playVoiceClip(1) REJECTED", e);
        });
      }
    }, halfMs);
    return () => clearTimeout(id);
  }, [machineState, engine]);

  // ── WIND_DOWN: fade all audio, play wind-down clip ────────────────────

  useEffect(() => {
    if (machineState !== "WIND_DOWN") return;

    engine.fadeOutAll(3);

    const voiceClips = getVoiceClips(scene, i18n.language);
    const windDownClip = voiceClips[2];

    setTimeout(() => {
      if (isPlaceholderSource(windDownClip.source)) {
        dispatch({ type: "WIND_DOWN_DONE" });
        return;
      }
      engine
        .playVoiceClip(2)
        .then(() => dispatch({ type: "WIND_DOWN_DONE" }))
        .catch((e) => {
          audioWarn("session WIND_DOWN: playVoiceClip(2) REJECTED", e);
          dispatch({ type: "WIND_DOWN_DONE" });
        });
    }, 3200); // after fade completes
  }, [machineState, engine]);

  // ── POST_SESSION → feedback form → After screen ────────────────────────

  useEffect(() => {
    if (machineState === "POST_SESSION") {
      setShowingFeedback(true);
    }
  }, [machineState]);

  const handleFeedbackSubmit = useCallback(
    (_answers: FeedbackAnswers) => {
      // TODO(supabase): persist answers to sessions feedback table.
      setShowingFeedback(false);
      router.push("/after");
    },
    [router]
  );

  const handleFeedbackSkip = useCallback(() => {
    setShowingFeedback(false);
    router.push("/after");
  }, [router]);

  // ── Crisis sheet pause/resume ─────────────────────────────────────────

  useEffect(() => {
    if (isCrisisOpen) {
      pausedSince.current = Date.now();
      engine.pauseAll();
    } else if (pausedSince.current !== null) {
      startedAt.current += Date.now() - pausedSince.current;
      pausedSince.current = null;
      engine.resumeAll();
    }
  }, [isCrisisOpen, engine]);

  // ── Elapsed timer ─────────────────────────────────────────────────────

  useEffect(() => {
    const active =
      machineState === "AMBIENT_FADE_IN" ||
      machineState === "ADAPTIVE_LOOP";
    if (!active) return;

    const id = setInterval(() => {
      if (!isCrisisOpen) {
        setElapsed(Date.now() - startedAt.current);
      }
    }, 250);
    return () => clearInterval(id);
  }, [machineState, isCrisisOpen]);

  // ── Manual distress (no watch / watch disconnected) ───────────────────

  const handleManualDistress = useCallback(() => {
    // For chronic high-baseline users, also notify the pulse monitor.
    reportManualDistress();

    // Silence trigger and start 90-second countdown.
    engine.onSpike();

    if (manualReturnTimer.current) clearTimeout(manualReturnTimer.current);
    if (manualCountdownInterval.current) clearInterval(manualCountdownInterval.current);

    let remaining = MANUAL_RETURN_MS / 1000;
    setManualCountdown(remaining);

    manualCountdownInterval.current = setInterval(() => {
      remaining -= 1;
      setManualCountdown(remaining);
      if (remaining <= 0) {
        if (manualCountdownInterval.current) clearInterval(manualCountdownInterval.current);
        manualCountdownInterval.current = null;
      }
    }, 1000);

    manualReturnTimer.current = setTimeout(() => {
      setManualCountdown(null);
      engine.onNormalized();
    }, MANUAL_RETURN_MS);
  }, [engine, reportManualDistress]);

  // Re-press resets the countdown (handleManualDistress always clears + restarts).
  const handleDistressPress = handleManualDistress;

  // ── Derived display ───────────────────────────────────────────────────

  const voiceText = useMemo(() => {
    if (machineState === "AMBIENT_FADE_IN" || machineState === "LOADING" || machineState === "DISCLAIMER") {
      return getVoiceScript(scene, "opening", i18n.language);
    }
    if (machineState === "ADAPTIVE_LOOP") {
      return isSpiked
        ? getVoiceScript(scene, "calming", i18n.language)
        : getVoiceScript(scene, "during", i18n.language);
    }
    return getVoiceScript(scene, "calming", i18n.language);
  }, [machineState, scene, i18n.language, isSpiked]);

  const slow = machineState === "WIND_DOWN" || isSpiked;
  const sceneLabel = localize(getScene(scene).label, i18n.language);

  // ── Pulse mock phase (drives mock generator arc) ──────────────────────
  // usePulseMonitor handles this internally, so we just display pulseBpm.

  // ── POST_SESSION: feedback form overlay ──────────────────────────────

  if (showingFeedback) {
    return (
      <PostSessionFeedback
        onSubmit={handleFeedbackSubmit}
        onSkip={handleFeedbackSkip}
      />
    );
  }

  // ── LOADING screen ────────────────────────────────────────────────────

  if (machineState === "LOADING") {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        {loadError ? (
          <>
            <Text style={{ color: tokens.text, fontFamily: fonts.body, fontSize: 16 }}>
              {loadError}
            </Text>
            <Pressable onPress={() => router.back()} style={{ marginTop: 24 }}>
              <Text style={{ color: tokens.accent, fontFamily: fonts.body, fontSize: 16 }}>
                {t("session.goBack")}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: tokens.text, fontFamily: fonts.body, fontSize: 14, opacity: 0.6 }}>
            {t("session.preparing")}
            {loadProgress > 0 ? ` ${Math.round(loadProgress * 100)}%` : ""}
          </Text>
        )}
      </View>
    );
  }

  // ── Main session screen ───────────────────────────────────────────────

  return (
    <View className="flex-1 bg-bg">
      <SceneBackground scene={scene} intensity={slow ? 0.86 : 0.78} />
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-7">

          {/* Header — nav element (close) on the leading edge so it reads
              correctly across both reading directions: LEFT in LTR English,
              RIGHT in RTL Hebrew (auto-flipped via I18nManager). */}
          <View className="flex-row justify-between items-center pt-2">
            <Pressable
              hitSlop={16}
              onPress={() => {
                setLastEndedBy("manual-exit");
                dispatch({ type: "SESSION_END" });
              }}
            >
              <Icon name="close" size={20} color={tokens.sceneText} />
            </Pressable>
            <CrisisAffordance tone="on-scene" />
          </View>

          {/* Watch status banner */}
          {watchBanner !== null && (
            <View style={{ marginTop: 8, padding: 8, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 8 }}>
              <Text style={{ color: tokens.sceneText, fontFamily: fonts.body, fontSize: 12 }}>
                {watchBanner === "no-watch"
                  ? t("session.noWatch")
                  : t("session.watchDisconnected")}
              </Text>
            </View>
          )}

          {/* Scene label */}
          <View className="pt-8">
            <Text
              style={{
                color: tokens.sceneText,
                fontFamily: fonts.body,
                fontSize: 13,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                opacity: 0.65,
              }}
            >
              {sceneLabel}
            </Text>
          </View>

          {/* Voice caption */}
          <View className="pt-16">
            <VoiceLine text={voiceText} />
          </View>

          {/* Breathing circle */}
          <View className="flex-1 justify-center">
            <BreathingCircle
              flash={machineState === "ADAPTIVE_LOOP" && !isSpiked ? 0 : 0}
              slow={slow}
              paused={isCrisisOpen}
            />
          </View>

          {/* Manual distress / countdown (visible when no HR source) */}
          {(watchBanner !== null || !watchConnected) && machineState === "ADAPTIVE_LOOP" && (
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              {manualCountdown !== null && (
                <Text style={{ color: tokens.sceneText, fontFamily: fonts.body, fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                  {t("session.triggerReturnsIn", { seconds: manualCountdown })}
                </Text>
              )}
              <Pressable
                hitSlop={12}
                onPress={handleDistressPress}
                style={{ padding: 8, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.35)" }}
              >
                <Text style={{ color: tokens.sceneText, fontFamily: fonts.body, fontSize: 14 }}>
                  {t("session.lowerSound")}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Session progress — horizontal bar across the bottom, fills
              left-to-right as session elapses. Track and fill are SIBLINGS
              with their own opacities so the fill renders at full opacity
              over a faded track. Previous version nested fill inside track,
              which multiplied the opacities and made the fill invisible. */}
          <View className="pt-6" style={{ position: "relative", height: 4 }}>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                backgroundColor: tokens.sceneText,
                opacity: 0.25,
                borderRadius: 2,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${Math.min(100, (elapsed / TOTAL_SESSION_MS) * 100)}%`,
                height: 4,
                backgroundColor: tokens.sceneText,
                opacity: 0.85,
                borderRadius: 2,
              }}
            />
          </View>
          <Text
            style={{
              color: tokens.sceneText,
              fontFamily: fonts.body,
              fontSize: 12,
              opacity: 0.65,
              marginTop: 6,
            }}
          >
            {formatElapsed(elapsed)}
          </Text>

          {/* "I need a moment" — calming-protocol entry, always visible
              during a session. Per UI QA pass 2: shown throughout, not
              just after the trigger has played. The original gating was
              based on an exposure-first clinical claim; the product
              direction now prioritizes user control + visible escape
              hatch from the start. LOADING/DISCLAIMER already return
              their own screens earlier so we don't render here in those. */}
          <View style={{ alignItems: "center", paddingBottom: 4 }}>
            <Pressable
              hitSlop={12}
              onPress={() => {
                engine.fadeOutAll(0.6);
                router.replace("/calming");
              }}
            >
              <Text style={{ color: tokens.sceneText, fontFamily: fonts.body, fontSize: 14, opacity: 0.75 }}>
                {t("home.needAMoment")}
              </Text>
            </Pressable>
          </View>

          {/* Bottom row — pulse metric removed per UI QA. Pulse is still
              read internally to drive auto-attenuate behavior, but no
              longer displayed to the user. */}
          {/* End session — was a barely-visible bracketed text. Now a
              bordered pill on sceneText color so it reads cleanly on
              both light and dark scene overlays. */}
          <View className="flex-row justify-end items-center pt-4 pb-6">
            <Pressable
              hitSlop={12}
              onPress={() => {
                setLastEndedBy("manual-exit");
                dispatch({ type: "SESSION_END" });
              }}
              style={{
                borderWidth: 1,
                borderColor: tokens.sceneText,
                borderRadius: 999,
                paddingHorizontal: 18,
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  color: tokens.sceneText,
                  fontFamily: fonts.body,
                  fontSize: 15,
                }}
              >
                {t("session.end")}
              </Text>
            </Pressable>
          </View>

        </View>
      </SafeAreaView>
    </View>
  );
}
