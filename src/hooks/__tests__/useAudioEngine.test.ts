import { renderHook } from "@testing-library/react-native";

jest.mock("react-native-audio-api", () => {
  class GainNode {
    gain = { value: 0 };
    connect() {}
  }
  class AudioContext {
    destination = {};
    createGain() {
      return new GainNode();
    }
    close() {}
  }
  class AudioBuffer {}
  class AudioBufferSourceNode {}
  return { AudioContext, AudioBuffer, AudioBufferSourceNode, GainNode };
});

import { useAudioEngine } from "@/hooks/useAudioEngine";

describe("useAudioEngine", () => {
  it("returns the same object reference across re-renders", () => {
    const { result, rerender } = renderHook(() => useAudioEngine());
    const first = result.current;
    rerender({});
    const second = result.current;
    expect(second).toBe(first);
  });
});
