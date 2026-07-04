import { useEffect, useRef } from "react";
import {
  AudioBuffer,
  AudioBufferSourceNode,
  AudioContext,
  GainNode,
} from "react-native-audio-api";

import { audioTrace, audioWarn } from "@/lib/audio/audio-log";
import { activateAudioSession } from "@/lib/audio/audio-session";

// v1.1.x — soothing music looped under the "Need a moment" calming protocol.
// Per Roy's labels: neo-classical (piano + strings) is the canonical pick.
// The asset is in the repo from Roy's delivery; we just need to play it.
const CALMING_SOURCE = require("@/assets/sounds/calming/neo-classical.mp3");

// Soft level — the protocol narration (text today, voice later) is the
// foreground; this is the ambient bed underneath. Tuned by ear; we can
// move it once Roy delivers the narration recordings and we hear them mixed.
const PLAYBACK_GAIN = 0.5;

/** Plays a soothing looping track for the lifetime of the screen that mounts
 *  this hook. Used by /calming.
 *
 *  Implementation: spins up its own AudioContext + GainNode + BufferSource so
 *  it doesn't touch the singleton session AudioEngine — the session engine is
 *  suspended while /calming is in front (per the v1.1.0 pause-on-blur), so we
 *  can't reuse its graph for unrelated playback.
 *
 *  Lifecycle:
 *    mount → activate audio session → decode mp3 → start looping
 *    unmount → stop + close the dedicated context
 *
 *  Resilient to fast mount/unmount: a cancelled flag short-circuits the start
 *  step if the user has already navigated away by the time decode resolves. */
export function useCalmingOverlay(): void {
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await activateAudioSession();

        const ctx = new AudioContext();
        ctxRef.current = ctx;
        // Resume the context the same way the session engine does — covers
        // iOS quirks where ctx is created suspended.
        try {
          await ctx.resume();
        } catch (e) {
          audioWarn("calming overlay: ctx.resume failed", e);
        }

        audioTrace("calming overlay: decoding", "ctx.state=", ctx.state);
        const buffer: AudioBuffer = await ctx.decodeAudioData(CALMING_SOURCE);

        if (cancelled) {
          // User left before decode finished — tear down the context we just
          // opened and bail without scheduling playback.
          try {
            ctx.close();
          } catch {
            /* ignore */
          }
          ctxRef.current = null;
          return;
        }

        const gain: GainNode = ctx.createGain();
        gain.gain.value = PLAYBACK_GAIN;
        gain.connect(ctx.destination);

        const src: AudioBufferSourceNode = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.loopStart = 0;
        src.loopEnd = buffer.duration;
        src.connect(gain);
        src.start(0);
        sourceRef.current = src;
        audioTrace("calming overlay: playing", "duration=", buffer.duration);
      } catch (e) {
        audioWarn("calming overlay: setup FAILED", e);
      }
    })();

    return () => {
      cancelled = true;
      try {
        sourceRef.current?.stop();
      } catch {
        /* already stopped */
      }
      sourceRef.current = null;
      try {
        ctxRef.current?.close();
      } catch {
        /* already closed */
      }
      ctxRef.current = null;
      audioTrace("calming overlay: stopped + ctx closed");
    };
  }, []);
}
