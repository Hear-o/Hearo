// Mock for `react-native-audio-api`. audio-engine.ts constructs an AudioContext
// and drives gain automation + buffer-source scheduling through it. Only
// AudioContext is used as a runtime value; AudioBuffer/AudioBufferSourceNode/
// GainNode are type-only imports, exported here as classes for completeness.
//
// Each context records the gain nodes and buffer sources it creates (in
// creation order) on `.gains` / `.sources`, and the most-recently constructed
// context is available via `__lastContext()` so tests can assert on the
// engine's internal nodes without exposing private fields.

class FakeAudioParam {
  value = 0;
  cancelScheduledValues = jest.fn();
  cancelAndHoldAtTime = jest.fn();
  setValueAtTime = jest.fn((v: number) => {
    this.value = v;
    return this;
  });
  linearRampToValueAtTime = jest.fn((v: number) => {
    this.value = v;
    return this;
  });
  exponentialRampToValueAtTime = jest.fn((v: number) => {
    this.value = v;
    return this;
  });
}

class FakeGainNode {
  gain = new FakeAudioParam();
  connect = jest.fn();
}

class FakeAudioBufferSourceNode {
  buffer: unknown = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  onEnded: (() => void) | null = null;
  connect = jest.fn();
  start = jest.fn();
  stop = jest.fn();
}

// When true, rendered/analysed buffers come back as digital silence so the
// audio self-test suite can exercise the FAIL path. Reset via __setSilent.
let silentRender = false;

class FakeOscillatorNode {
  frequency = new FakeAudioParam();
  detune = new FakeAudioParam();
  type = "sine";
  connect = jest.fn();
  start = jest.fn();
  stop = jest.fn();
}

class FakeAnalyserNode {
  fftSize = 2048;
  connect = jest.fn();
  // Silence in 8-bit time-domain data is a flat 128. A live signal swings
  // away from it; we synthesize a swing unless silentRender is set.
  getByteTimeDomainData = jest.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = silentRender ? 128 : 128 + Math.round(100 * Math.sin((2 * Math.PI * i) / 32));
    }
  });
  getFloatTimeDomainData = jest.fn();
  getByteFrequencyData = jest.fn();
  getFloatFrequencyData = jest.fn();
}

class FakeAudioBuffer {
  length: number;
  sampleRate: number;
  numberOfChannels = 1;
  private _samples: Float32Array;

  // Backward compatible: existing suites construct `new FakeAudioBuffer(1)` and
  // only read `.duration`. The optional opts add a real (or silent) PCM frame
  // so the audio self-test can call getChannelData().
  constructor(
    public duration = 1,
    opts?: { length?: number; sampleRate?: number; silent?: boolean },
  ) {
    this.sampleRate = opts?.sampleRate ?? 44100;
    this.length = opts?.length ?? Math.max(1, Math.floor(duration * this.sampleRate));
    const silent = opts?.silent ?? false;
    this._samples = new Float32Array(this.length);
    if (!silent) {
      for (let i = 0; i < this.length; i++) {
        this._samples[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / this.sampleRate);
      }
    }
  }

  getChannelData(_channel: number): Float32Array {
    return this._samples;
  }
}

class FakeOfflineAudioContext {
  destination = {};
  gains: FakeGainNode[] = [];
  oscillators: FakeOscillatorNode[] = [];

  constructor(
    public numberOfChannels: number,
    public length: number,
    public sampleRate: number,
  ) {}

  createGain = jest.fn(() => {
    const g = new FakeGainNode();
    this.gains.push(g);
    return g;
  });

  createOscillator = jest.fn(() => {
    const o = new FakeOscillatorNode();
    this.oscillators.push(o);
    return o;
  });

  startRendering = jest.fn(
    async () =>
      new FakeAudioBuffer(this.length / this.sampleRate, {
        length: this.length,
        sampleRate: this.sampleRate,
        silent: silentRender,
      }),
  );
}

class FakeAudioContext {
  static last: FakeAudioContext | null = null;

  currentTime = 0;
  state = "running";
  destination = {};
  gains: FakeGainNode[] = [];
  sources: FakeAudioBufferSourceNode[] = [];
  oscillators: FakeOscillatorNode[] = [];
  analysers: FakeAnalyserNode[] = [];

  constructor() {
    FakeAudioContext.last = this;
  }

  createOscillator = jest.fn(() => {
    const o = new FakeOscillatorNode();
    this.oscillators.push(o);
    return o;
  });

  createAnalyser = jest.fn(() => {
    const a = new FakeAnalyserNode();
    this.analysers.push(a);
    return a;
  });

  createGain = jest.fn(() => {
    const g = new FakeGainNode();
    this.gains.push(g);
    return g;
  });

  createBufferSource = jest.fn(() => {
    const s = new FakeAudioBufferSourceNode();
    this.sources.push(s);
    return s;
  });

  decodeAudioData = jest.fn(async (_src: unknown) => new FakeAudioBuffer(1));

  suspend = jest.fn(async () => {
    this.state = "suspended";
  });

  resume = jest.fn(async () => {
    this.state = "running";
  });

  close = jest.fn(() => {
    this.state = "closed";
  });
}

export const AudioContext = FakeAudioContext;
export const OfflineAudioContext = FakeOfflineAudioContext;
export const AudioBuffer = FakeAudioBuffer;
export const AudioBufferSourceNode = FakeAudioBufferSourceNode;
export const GainNode = FakeGainNode;
export const OscillatorNode = FakeOscillatorNode;
export const AnalyserNode = FakeAnalyserNode;

/** Force rendered/analysed audio to digital silence (audio self-test FAIL
 *  path). Call __setSilent(false) to restore the default tone. */
export function __setSilent(value: boolean): void {
  silentRender = value;
}

// audio-session.ts (imported transitively by useAudioEngine + _layout) calls
// these at module load. They have to exist on the mock or the entire engine
// test suite fails at import time.
export const AudioManager = {
  setAudioSessionOptions: jest.fn(),
  observeAudioInterruptions: jest.fn(),
  setAudioSessionActivity: jest.fn(async () => {}),
};

/** The most recently constructed AudioContext (i.e. the one inside the engine
 *  under test). Throws if no engine has been created yet. */
export function __lastContext(): FakeAudioContext {
  if (!FakeAudioContext.last) throw new Error("no AudioContext constructed yet");
  return FakeAudioContext.last;
}

export function __reset(): void {
  FakeAudioContext.last = null;
  silentRender = false;
}
