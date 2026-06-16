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

class FakeAudioBuffer {
  constructor(public duration = 1) {}
}

class FakeAudioContext {
  static last: FakeAudioContext | null = null;

  currentTime = 0;
  state = "running";
  destination = {};
  gains: FakeGainNode[] = [];
  sources: FakeAudioBufferSourceNode[] = [];

  constructor() {
    FakeAudioContext.last = this;
  }

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
export const AudioBuffer = FakeAudioBuffer;
export const AudioBufferSourceNode = FakeAudioBufferSourceNode;
export const GainNode = FakeGainNode;

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
}
