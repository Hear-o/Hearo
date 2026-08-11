import { localEdgeLlm, requireNativeElFfi } from "edge-intelligence-sdk";

import {
  createEdgeChatSession,
  getEdgeErrorMessage,
  getEdgeNativeAvailability,
} from "@/lib/chat/edgeChat";

jest.mock("edge-intelligence-sdk", () => ({
  localEdgeLlm: jest.fn(),
  requireNativeElFfi: jest.fn(),
}));

const local = jest.mocked(localEdgeLlm);
const requireNative = jest.mocked(requireNativeElFfi);

describe("edge chat session", () => {
  beforeEach(() => {
    local.mockReset();
    requireNative.mockReset();
  });

  it("uses the configured local GGUF model", () => {
    const engine = { ask: jest.fn(), askStreamCb: jest.fn(), reset: jest.fn() };
    local.mockReturnValue(engine);

    const session = createEdgeChatSession("/documents/models/hearo.gguf", "/documents/models/tokenizer.json");

    expect(local).toHaveBeenCalledWith("/documents/models/hearo.gguf", "/documents/models/tokenizer.json");
    expect(session).toBe(engine);
  });

  it("converts Expo file URIs to the native filesystem path", () => {
    const engine = { ask: jest.fn(), askStreamCb: jest.fn(), reset: jest.fn() };
    local.mockReturnValue(engine);

    createEdgeChatSession("file:///data/user/0/com.techheal.hearo/files/models/hearo.gguf", "file:///data/user/0/com.techheal.hearo/files/models/tokenizer.json");

    expect(local).toHaveBeenCalledWith(
      "/data/user/0/com.techheal.hearo/files/models/hearo.gguf",
      "/data/user/0/com.techheal.hearo/files/models/tokenizer.json",
    );
  });

  it("preserves the SDK provider error detail", () => {
    expect(
      getEdgeErrorMessage({
        name: "SdkError.ProviderError",
        inner: { message: "failed to parse GGUF" },
      }),
    ).toBe("failed to parse GGUF");
  });

  it("never falls back to the SDK development model", () => {
    expect(() => createEdgeChatSession("", "")).toThrow("Download the on-device language model");
    expect(local).not.toHaveBeenCalled();
  });

  it("explains when the native JSI module was not linked", () => {
    requireNative.mockImplementation(() => {
      throw new Error("edge-intelligence-sdk native module is unavailable");
    });

    expect(getEdgeNativeAvailability()).toEqual({
      available: false,
      message: "edge-intelligence-sdk native module is unavailable",
    });
    expect(() => createEdgeChatSession("file:///documents/models/hearo.gguf", "file:///documents/models/tokenizer.json")).toThrow("edge-intelligence-sdk native module is unavailable");
    expect(local).not.toHaveBeenCalled();
  });
});
