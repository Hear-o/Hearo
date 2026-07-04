// Three-layer Web Audio graph for HearO exposure sessions.
//
// Layer 1  Ambient  — looping soundscape, gain locked at 1.0
// Layer 2  Trigger  — intermittent burst scheduler: fires at randomized
//                     intervals, each burst fades in → plays → fades out.
//                     HR events pause/resume the scheduler.
// Layer 3  Voice    — one-shot voice clips; interrupts any active burst
//
// Usage lifecycle:
//   1. new AudioEngine()
//   2. await engine.loadAmbientAndVoice(ambientSrc, voiceSrcs)
//   3. await engine.loadTrigger(triggerSrc)
//   4. engine.startAmbient()               — call at AMBIENT_FADE_IN entry
//   5. engine.startTriggerScheduler(cfg)   — call at ADAPTIVE_LOOP entry
//   6. engine.onSpike() / onNormalized()   — driven by usePulseMonitor
//   7. engine.playVoiceClip(index)         — DISCLAIMER / MID_SESSION / WIND_DOWN
//   8. engine.destroy()                    — on unmount or session end

import {
  AudioContext,
  AudioBuffer,
  AudioBufferSourceNode,
  GainNode,
} from 'react-native-audio-api';

import { audioTrace, audioWarn } from './audio-log';

// Linear gain for practical silence (≈ −60 dB, inaudible).
// exponentialRampToValueAtTime cannot start from exactly 0.
const SILENCE_GAIN = 0.001;

export function dBToGain(dB: number): number {
  return Math.pow(10, dB / 20);
}

// v1.1.3: how much we duck the ambient bed while a trigger burst is playing.
// -3 dB halves power without halving perceived loudness — the scene stays
// audibly present so the trigger feels like an event INSIDE the scene rather
// than a replacement for it. Combined with the lower trigger ceiling
// (session.tsx DEFAULT_CEILING_DB = -9 dB), this gets us to a mix where the
// burst pops above the scene without drowning it.
const AMBIENT_DUCK_GAIN = dBToGain(-3);

// v1.1.6 → v1.1.8: ambient duck during voice. Hili's UX review (2026-06-29)
// flagged that narration still competed audibly with the ambient bed at the
// initial -6 dB setting. Push to -9 dB — roughly quarter power — so the
// voice sits clearly above the scene without the user straining to parse
// the words. Trigger duck stays at -3 dB; voice is the only audio that gets
// this much priority over the ambient.
const AMBIENT_DUCK_GAIN_VOICE = dBToGain(-9);

// Cancel any scheduled gain automation and freeze at the current instantaneous
// value. cancelScheduledValues alone does NOT stop a mid-flight curve; we need
// cancelAndHoldAtTime (or the setValueAtTime workaround if unavailable).
function freezeGain(gain: GainNode['gain'], ctx: AudioContext): void {
  const now = ctx.currentTime;
  const current = gain.value;
  gain.cancelScheduledValues(now);
  if (typeof (gain as any).cancelAndHoldAtTime === 'function') {
    (gain as any).cancelAndHoldAtTime(now);
  } else {
    gain.setValueAtTime(current, now);
  }
}

function randomBetween(minMs: number, maxMs: number): number {
  return minMs + Math.random() * (maxMs - minMs);
}

/** Configuration for the intermittent trigger burst scheduler. */
export interface TriggerSchedulerConfig {
  /** Minimum wait between the end of one burst and the start of the next (ms). */
  intervalMinMs: number;
  /** Maximum wait between bursts (ms). Actual interval is randomized in this range. */
  intervalMaxMs: number;
  /** How long each burst plays at full gain before fading out (ms). */
  burstDurationMs: number;
  /** Fade-in duration for each burst (ms). Smooths the onset. */
  fadeInMs: number;
  /** Fade-out duration at burst end (ms). */
  fadeOutMs: number;
  /** Peak linear gain for the trigger during a burst. Use dBToGain() from content. */
  peakGain: number;
  /** How long before each burst starts the lead-in heads-up should fire (ms).
   *  v1.1.3: gives the screen layer a window to switch its caption from the
   *  in-session "during" text to a grounding heads-up like "a moment is
   *  coming — stay with your breath". Default 4000ms. Set to 0 to disable. */
  leadInMs?: number;
  /** Optional: fired ~leadInMs before each burst's fade-in begins (v1.1.3).
   *  Lets the screen layer present a heads-up caption / queue a lead-in voice
   *  clip once Roy delivers those. */
  onBurstApproaching?: () => void;
  /** Optional: fired when a burst's fade-out ramp completes (v1.1.0).
   *  Lets the screen layer present a "back to the moment" caption (and,
   *  once Roy delivers the grounding voice clip, queue it for playback). */
  onBurstEnd?: () => void;
}

export type { AudioBuffer };

export class AudioEngine {
  private ctx: AudioContext;

  // Gain nodes — created once, persist for session lifetime.
  private ambientGain: GainNode;
  private triggerGain: GainNode;
  private voiceGain: GainNode;

  // Decoded buffers — loaded before session starts.
  private ambientBuffer: AudioBuffer | null = null;
  // v1.1.0: a session can rotate between multiple trigger sounds (the user
  // may pick 1–N in Setup). _fireBurst picks one at random per burst so the
  // session feels less monotonous. Each entry is one decoded variation —
  // sources is the parallel array of the input "keys" so subsequent
  // loadTriggers() calls can skip work that's already cached.
  private triggerBuffers: AudioBuffer[] = [];
  private _loadedTriggerSources: (number | string)[] = [];
  private voiceBuffers: AudioBuffer[] = [];

  // Active looping source node for ambient.
  private ambientSource: AudioBufferSourceNode | null = null;
  // Active voice source — tracked so "Need a moment" can cut a mid-sentence
  // clip immediately rather than letting it ride out. Set in playVoiceClip,
  // cleared on natural end OR explicit stopVoice().
  private _voiceSource: AudioBufferSourceNode | null = null;

  // ── Burst scheduler state ────────────────────────────────────────────────

  private _config: TriggerSchedulerConfig | null = null;
  private _schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  private _leadInTimer: ReturnType<typeof setTimeout> | null = null;
  private _burstEndTimer: ReturnType<typeof setTimeout> | null = null;
  private _burstCleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private _burstSource: AudioBufferSourceNode | null = null;
  private _burstActive = false;
  private _schedulerPaused = false;
  private _graceTimer: ReturnType<typeof setTimeout> | null = null;
  // The ambient gain we duck DOWN from at burst start, restored at burst end.
  // Captured per-burst so a user adjustment mid-session (rare) isn't clobbered.
  private _ambientGainPreDuck: number | null = null;
  // Same idea for voice playback. Captured at the first voice clip start;
  // overlapping/chained voice clips share the same captured value so a
  // back-to-back voice sequence doesn't accumulate duck-on-ducked-on-ducked.
  private _ambientGainPreVoiceDuck: number | null = null;

  constructor() {
    this.ctx = new AudioContext();
    // Note: we don't call ctx.resume() in the ctor. Activation is driven from
    // the hook layer via activateAudioSession() + the explicit resume+poll
    // inside startAmbient(). Calling resume here once produced obscure
    // jest-mock overflow failures in the parallel-worker suite — having it in
    // the load path only is cleaner anyway, since playback never starts
    // without going through startAmbient or the trigger scheduler.

    this.ambientGain = this.ctx.createGain();
    this.triggerGain = this.ctx.createGain();
    this.voiceGain = this.ctx.createGain();

    this.ambientGain.gain.value = 1.0;
    this.triggerGain.gain.value = SILENCE_GAIN;
    this.voiceGain.gain.value = 1.0;

    this.ambientGain.connect(this.ctx.destination);
    this.triggerGain.connect(this.ctx.destination);
    this.voiceGain.connect(this.ctx.destination);
  }

  // ── Buffer loading ──────────────────────────────────────────────────────

  // Two-phase loading: ambient + voice clips are needed for DISCLAIMER;
  // the trigger buffer is only needed at ADAPTIVE_LOOP entry.

  async loadAmbientAndVoice(
    ambientSource: number | string,
    voiceClipSources: (number | string)[]
  ): Promise<void> {
    // Idempotent: /preparing typically loads first, /session may re-call.
    // Decoding the same buffers twice is wasteful and (more importantly)
    // re-creates the AudioBuffer instances, invalidating any source nodes
    // already wired into the graph.
    /* istanbul ignore if — re-entrant call path; covered on-device by the
       /preparing → /session handoff. */
    if (this.ambientBuffer && this.voiceBuffers.length === voiceClipSources.length) {
      audioTrace("engine: loadAmbientAndVoice — already loaded, skip");
      return;
    }
    audioTrace("engine: loadAmbientAndVoice start, ctx.state=", this.ctx.state);
    try {
      const [ambientBuf, ...voiceBufs] = await Promise.all([
        this.ctx.decodeAudioData(ambientSource),
        ...voiceClipSources.map((s) => this.ctx.decodeAudioData(s)),
      ]);
      this.ambientBuffer = ambientBuf;
      this.voiceBuffers = voiceBufs;
      audioTrace("engine: loadAmbientAndVoice done, ambientDuration=",
        ambientBuf.duration, "voiceCount=", voiceBufs.length);
    } catch (/* istanbul ignore next — decodeAudioData failure; on-device */ e) {
      /* istanbul ignore next */
      audioWarn("engine: loadAmbientAndVoice FAILED", e);
      /* istanbul ignore next */
      throw e;
    }
  }

  /** Single-source loader (legacy, kept so existing call sites + tests still
   *  work). Internally just forwards to loadTriggers([source]). */
  async loadTrigger(triggerSource: number | string): Promise<void> {
    await this.loadTriggers([triggerSource]);
  }

  /** Multi-source loader (v1.1.0). Decodes every passed source into the
   *  trigger-buffers list. The scheduler picks one at random per burst so a
   *  session with N selected sounds rotates between them.
   *
   *  Idempotent: if the source list matches what's already loaded (same
   *  values in the same order), this is a no-op. Different set replaces. */
  async loadTriggers(triggerSources: (number | string)[]): Promise<void> {
    /* istanbul ignore if — re-entrant call path; covered on-device. */
    if (
      this.triggerBuffers.length === triggerSources.length &&
      triggerSources.every((s, i) => this._loadedTriggerSources[i] === s)
    ) {
      audioTrace("engine: loadTriggers — same set already loaded, skip");
      return;
    }
    audioTrace(
      "engine: loadTriggers start, ctx.state=",
      this.ctx.state,
      "count=",
      triggerSources.length,
    );
    try {
      const buffers = await Promise.all(
        triggerSources.map((s) => this.ctx.decodeAudioData(s)),
      );
      this.triggerBuffers = buffers;
      this._loadedTriggerSources = triggerSources.slice();
      audioTrace("engine: loadTriggers done, decoded=", buffers.length);
      /* istanbul ignore next — decodeAudioData failure path; on-device defense. */
    } catch (e) {
      audioWarn("engine: loadTriggers FAILED", e);
      throw e;
    }
  }

  // ── Ambient ─────────────────────────────────────────────────────────────

  async startAmbient(): Promise<void> {
    audioTrace("engine: startAmbient called, ctx.state=", this.ctx.state,
      "hasBuffer=", !!this.ambientBuffer, "alreadyPlaying=", !!this.ambientSource);
    if (!this.ambientBuffer) {
      audioWarn("engine: startAmbient ABORTED — ambient buffer not loaded");
      throw new Error('ambient buffer not loaded');
    }
    if (this.ambientSource) return;

    // If the context is still suspended, retry resume() and actually wait
    // for the state to flip. ctx.resume() can resolve "successfully" while
    // leaving state==suspended on some iOS versions, so we poll up to ~1s.
    /* istanbul ignore if — on-device defensive; test ctx is always "running". */
    if (this.ctx.state === "suspended") {
      audioTrace("engine: ctx suspended at startAmbient — awaiting resume()");
      try {
        await this.ctx.resume();
      } catch (e) {
        audioWarn("engine: ctx.resume() at startAmbient rejected", e);
      }
      for (let i = 0; i < 10 && this.ctx.state === "suspended"; i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      audioTrace("engine: ctx.state after resume +poll=", this.ctx.state);
    }

    const src = this.ctx.createBufferSource();
    src.buffer = this.ambientBuffer;
    src.loop = true;
    src.loopStart = 0;
    src.loopEnd = this.ambientBuffer.duration;
    src.connect(this.ambientGain);
    src.start(0);
    this.ambientSource = src;
    audioTrace("engine: startAmbient SUCCESS — source started, ctx.state=", this.ctx.state);
  }

  setAmbientGain(gain: number): void {
    const clamped = Math.min(1.0, Math.max(SILENCE_GAIN, gain));
    freezeGain(this.ambientGain.gain, this.ctx);
    this.ambientGain.gain.linearRampToValueAtTime(clamped, this.ctx.currentTime + 0.05);
  }

  // ── Burst scheduler ──────────────────────────────────────────────────────

  startTriggerScheduler(config: TriggerSchedulerConfig): void {
    if (this.triggerBuffers.length === 0) {
      throw new Error('trigger buffer not loaded');
    }
    this._config = { ...config };
    this._schedulerPaused = false;
    this._scheduleNextBurst();
  }

  stopTriggerScheduler(): void {
    this._schedulerPaused = true;
    this._clearSchedulerTimers();
    this._stopBurstNow();
  }

  private _scheduleNextBurst(): void {
    if (this._schedulerPaused || !this._config) return;
    const delay = randomBetween(this._config.intervalMinMs, this._config.intervalMaxMs);

    // Lead-in heads-up: fire `leadInMs` before the burst, so the screen layer
    // gets a window to switch its caption / queue a pre-burst voice clip. If
    // the random interval came in smaller than the lead-in window, fire the
    // heads-up immediately (still better than no anticipation phase).
    const leadInMs = this._config.leadInMs ?? 0;
    if (leadInMs > 0 && this._config.onBurstApproaching) {
      const leadInDelay = Math.max(0, delay - leadInMs);
      const cb = this._config.onBurstApproaching;
      this._leadInTimer = setTimeout(() => {
        this._leadInTimer = null;
        cb();
      }, leadInDelay);
    }

    this._schedulerTimer = setTimeout(() => this._fireBurst(), delay);
  }

  private _fireBurst(): void {
    /* istanbul ignore if — defensive: _scheduleNextBurst gates on the same
       conditions before setting the setTimeout, so this early return only
       fires on races (scheduler stopped between schedule and fire). */
    if (
      this._schedulerPaused ||
      !this._config ||
      this.triggerBuffers.length === 0
    ) {
      return;
    }

    const cfg = this._config;
    const now = this.ctx.currentTime;
    const fadeInSec = cfg.fadeInMs / 1000;

    // v1.1.0: pick a random buffer from the loaded set so a session rotates
    // between the user's selected triggers (and their variations).
    const buffer = this.triggerBuffers[
      Math.floor(Math.random() * this.triggerBuffers.length)
    ];

    // Create a fresh non-looping source node for this burst.
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = false;
    src.connect(this.triggerGain);

    // Ramp gain from silence → peak over fadeIn window.
    freezeGain(this.triggerGain.gain, this.ctx);
    this.triggerGain.gain.setValueAtTime(SILENCE_GAIN, now);
    this.triggerGain.gain.linearRampToValueAtTime(cfg.peakGain, now + fadeInSec);

    // Duck the ambient bed in parallel with the trigger ramp so the scene
    // recedes (but stays audible) while the practice-moment plays. Restored
    // on burst end. Capturing pre-duck value here means setAmbientGain calls
    // between bursts don't get clobbered when we restore.
    this._ambientGainPreDuck = this.ambientGain.gain.value;
    freezeGain(this.ambientGain.gain, this.ctx);
    this.ambientGain.gain.linearRampToValueAtTime(
      this._ambientGainPreDuck * AMBIENT_DUCK_GAIN,
      now + fadeInSec,
    );

    src.start(now);
    this._burstSource = src;
    this._burstActive = true;

    // Schedule fade-out after burstDuration.
    this._burstEndTimer = setTimeout(
      () => this._endBurst(),
      cfg.fadeInMs + cfg.burstDurationMs
    );
  }

  private _endBurst(): void {
    if (!this._config) return;
    const cfg = this._config;
    const now = this.ctx.currentTime;
    const fadeOutSec = cfg.fadeOutMs / 1000;

    freezeGain(this.triggerGain.gain, this.ctx);
    this.triggerGain.gain.linearRampToValueAtTime(SILENCE_GAIN, now + fadeOutSec);

    // Restore the ambient bed in parallel with the trigger fade-out — the
    // scene rises back as the practice-moment recedes. Falls back to the
    // current value (no-op) if _fireBurst didn't capture a pre-duck reading
    // (defensive — shouldn't happen in practice).
    if (this._ambientGainPreDuck !== null) {
      freezeGain(this.ambientGain.gain, this.ctx);
      this.ambientGain.gain.linearRampToValueAtTime(
        this._ambientGainPreDuck,
        now + fadeOutSec,
      );
      this._ambientGainPreDuck = null;
    }

    // Notify the screen layer that a burst just ended so it can show the
    // post-trigger grounding caption (v1.1.0). Fire AFTER the fade is
    // scheduled but BEFORE the cleanup-then-next-burst pipeline, so the
    // caption appears as the sound recedes.
    cfg.onBurstEnd?.();

    // Stop the source node after the fade completes, then schedule next burst.
    this._burstCleanupTimer = setTimeout(() => {
      this._stopBurstNow();
      this._scheduleNextBurst();
    }, cfg.fadeOutMs + 50);
  }

  // Hard-stop the current burst source and reset burst state.
  private _stopBurstNow(): void {
    if (this._burstSource) {
      try { this._burstSource.stop(); } catch { /* already stopped */ }
      this._burstSource = null;
    }
    this._burstActive = false;
    // Restore the ambient duck if a burst was hard-stopped (spike, interrupt,
    // scheduler stop). _endBurst already restores via its smooth ramp and
    // clears _ambientGainPreDuck, so this is a no-op on the natural path.
    if (this._ambientGainPreDuck !== null) {
      const now = this.ctx.currentTime;
      freezeGain(this.ambientGain.gain, this.ctx);
      this.ambientGain.gain.linearRampToValueAtTime(this._ambientGainPreDuck, now + 0.3);
      this._ambientGainPreDuck = null;
    }
  }

  private _clearSchedulerTimers(): void {
    if (this._schedulerTimer) { clearTimeout(this._schedulerTimer); this._schedulerTimer = null; }
    if (this._leadInTimer) { clearTimeout(this._leadInTimer); this._leadInTimer = null; }
    if (this._burstEndTimer) { clearTimeout(this._burstEndTimer); this._burstEndTimer = null; }
    if (this._burstCleanupTimer) { clearTimeout(this._burstCleanupTimer); this._burstCleanupTimer = null; }
  }

  // Interrupt an active burst with a fast fade-out (used before voice playback).
  private _interruptBurst(): void {
    this._clearSchedulerTimers();
    const now = this.ctx.currentTime;
    freezeGain(this.triggerGain.gain, this.ctx);
    this.triggerGain.gain.linearRampToValueAtTime(SILENCE_GAIN, now + 0.3);
    setTimeout(() => this._stopBurstNow(), 350);
  }

  // ── Live config setters ──────────────────────────────────────────────────

  setTriggerPeakGain(gain: number): void {
    if (!this._config) return;
    this._config.peakGain = Math.max(SILENCE_GAIN, gain);
    // If a burst is currently at full gain, update it live.
    if (this._burstActive) {
      const now = this.ctx.currentTime;
      freezeGain(this.triggerGain.gain, this.ctx);
      this.triggerGain.gain.linearRampToValueAtTime(this._config.peakGain, now + 0.1);
    }
  }

  setIntervalRange(minMs: number, maxMs: number): void {
    if (!this._config) return;
    this._config.intervalMinMs = minMs;
    this._config.intervalMaxMs = maxMs;
    // Takes effect at the next scheduled burst — no need to reset the current timer.
  }

  setBurstDuration(ms: number): void {
    if (!this._config) return;
    this._config.burstDurationMs = ms;
  }

  get currentTriggerGain(): number {
    return this.triggerGain.gain.value;
  }

  get isBurstActive(): boolean {
    return this._burstActive;
  }

  // ── Spike / normalize ────────────────────────────────────────────────────

  onSpike(): void {
    if (this._schedulerPaused) return;
    this._schedulerPaused = true;
    this._clearSchedulerTimers();
    // Fade out any active burst immediately.
    if (this._burstActive) {
      const now = this.ctx.currentTime;
      freezeGain(this.triggerGain.gain, this.ctx);
      this.triggerGain.gain.linearRampToValueAtTime(SILENCE_GAIN, now + 2.5);
      setTimeout(() => this._stopBurstNow(), 2600);
    }
    if (this._graceTimer) { clearTimeout(this._graceTimer); this._graceTimer = null; }
  }

  onNormalized(): void {
    if (!this._schedulerPaused) return;
    if (this._graceTimer) clearTimeout(this._graceTimer);
    this._graceTimer = setTimeout(() => {
      if (this.ctx.state === 'closed') return;
      this._graceTimer = null;
      this._schedulerPaused = false;
      this._scheduleNextBurst();
    }, 30_000);
  }

  // ── Voice overlay ────────────────────────────────────────────────────────

  playVoiceClip(index: number): Promise<void> {
    const buffer = this.voiceBuffers[index];
    audioTrace("engine: playVoiceClip", index, "hasBuffer=", !!buffer,
      "ctx.state=", this.ctx.state);
    if (!buffer) return Promise.resolve();

    // v1.1.6: cut any in-flight voice clip BEFORE starting a new one. Without
    // this, post-burst calming voice could overlap with mid-session voice if
    // they fire close together — two narrators talking at once.
    if (this._voiceSource) {
      try { this._voiceSource.stop(); } catch { /* already stopped */ }
      this._voiceSource = null;
    }

    // Stop any active burst with a fast fade before starting voice.
    this._interruptBurst();

    return new Promise<void>((resolve) => {
      // Small delay to let the burst interrupt fade settle.
      setTimeout(() => {
        // v1.1.6: duck ambient for the voice clip so the narration sits
        // clearly above the scene bed. Capture pre-duck value only on the
        // FIRST voice in a chain — overlapping clips share the same capture
        // so we don't duck-on-already-ducked and restore to a stale midpoint.
        if (this._ambientGainPreVoiceDuck === null) {
          this._ambientGainPreVoiceDuck = this.ambientGain.gain.value;
        }
        const duckNow = this.ctx.currentTime;
        freezeGain(this.ambientGain.gain, this.ctx);
        this.ambientGain.gain.linearRampToValueAtTime(
          this._ambientGainPreVoiceDuck * AMBIENT_DUCK_GAIN_VOICE,
          duckNow + 0.3,
        );

        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(this.voiceGain);

        let resolved = false;
        const finish = () => {
          if (resolved) return;
          resolved = true;
          // Restore the ambient duck — but ONLY if we're still the active
          // voice. A later playVoiceClip would have replaced _voiceSource;
          // in that case the new clip is keeping the ambient ducked and
          // will restore at its own end. This is the chained-voice guard.
          if (this._voiceSource === src) {
            this._voiceSource = null;
            if (this._ambientGainPreVoiceDuck !== null) {
              const restoreNow = this.ctx.currentTime;
              freezeGain(this.ambientGain.gain, this.ctx);
              this.ambientGain.gain.linearRampToValueAtTime(
                this._ambientGainPreVoiceDuck,
                restoreNow + 0.3,
              );
              this._ambientGainPreVoiceDuck = null;
            }
          }
          // Resume scheduler after voice clip finishes (if not paused by spike).
          if (!this._schedulerPaused) this._scheduleNextBurst();
          resolve();
        };

        src.onEnded = finish;
        setTimeout(finish, buffer.duration * 1000 + 300);
        src.start(0);
        this._voiceSource = src;
      }, 350);
    });
  }

  /** Cut any in-flight voice clip immediately. Used by "Need a moment" so the
   *  narration doesn't keep speaking through a pause. Idempotent. */
  stopVoice(): void {
    if (!this._voiceSource) return;
    audioTrace("engine: stopVoice — cutting in-flight voice clip");
    try {
      this._voiceSource.stop();
    } catch {
      /* already stopped — harmless */
    }
    this._voiceSource = null;
    // v1.1.6: external stopVoice bypasses the finish() restore-ambient path
    // (it sets _voiceSource = null, so finish's "still the active voice"
    // guard fails). Restore here directly so the ambient bed comes back up
    // when the user pauses the session mid-narration.
    if (this._ambientGainPreVoiceDuck !== null) {
      const now = this.ctx.currentTime;
      freezeGain(this.ambientGain.gain, this.ctx);
      this.ambientGain.gain.linearRampToValueAtTime(
        this._ambientGainPreVoiceDuck,
        now + 0.3,
      );
      this._ambientGainPreVoiceDuck = null;
    }
  }

  // ── Pause / resume (crisis sheet) ───────────────────────────────────────

  async pauseAll(): Promise<void> {
    audioTrace("engine: pauseAll, ctx.state was", this.ctx.state);
    try {
      await this.ctx.suspend();
      audioTrace("engine: pauseAll done, ctx.state=", this.ctx.state);
      /* istanbul ignore next — suspend() reject path; on-device defense. */
    } catch (e) {
      audioWarn("engine: pauseAll REJECTED", e);
    }
  }

  async resumeAll(): Promise<void> {
    audioTrace("engine: resumeAll, ctx.state was", this.ctx.state);
    try {
      await this.ctx.resume();
      audioTrace("engine: resumeAll done, ctx.state=", this.ctx.state);
      /* istanbul ignore next — resume() reject path; on-device defense. */
    } catch (e) {
      audioWarn("engine: resumeAll REJECTED", e);
    }
  }

  // ── Wind-down ────────────────────────────────────────────────────────────

  fadeOutAll(durationSeconds = 3): void {
    this._clearSchedulerTimers();
    this._schedulerPaused = true;
    this._stopBurstNow(); // stop the active source node immediately

    const now = this.ctx.currentTime;
    const end = now + durationSeconds;

    // Trigger: fast silence (300ms) — no more bursts once wind-down starts.
    freezeGain(this.triggerGain.gain, this.ctx);
    this.triggerGain.gain.linearRampToValueAtTime(SILENCE_GAIN, now + 0.3);

    // Ambient: gradual fade over the full wind-down duration.
    freezeGain(this.ambientGain.gain, this.ctx);
    this.ambientGain.gain.linearRampToValueAtTime(0, end);
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  destroy(): void {
    this._clearSchedulerTimers();
    if (this._graceTimer) { clearTimeout(this._graceTimer); this._graceTimer = null; }
    this._stopBurstNow();
    try { this.ambientSource?.stop(); } catch { /* already stopped */ }
    this.ctx.close();
  }
}
