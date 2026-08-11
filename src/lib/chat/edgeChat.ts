import {
  localEdgeLlm,
  requireNativeElFfi,
  type EdgeLlmLike,
} from "edge-intelligence-sdk";

export type EdgeNativeAvailability =
  | { available: true }
  | { available: false; message: string };

type ProviderError = { inner?: { message?: unknown } };

export function getEdgeErrorMessage(error: unknown): string {
  const providerError = error as ProviderError | null;
  if (typeof providerError?.inner?.message === "string") {
    return providerError.inner.message;
  }

  return error instanceof Error
    ? error.message
    : "The on-device assistant is unavailable in this build.";
}

function toNativeModelPath(modelUri: string): string {
  const uri = modelUri.trim();
  // Expo File.uri is a file:// URL while Candle's Android binding receives a
  // filesystem path. The SDK documents /data/user/... rather than file:///...
  return uri.startsWith("file://") ? uri.slice("file://".length) : uri;
}

/**
 * Version 0.3.14 owns JSI installation through its React Native entrypoint.
 * Probe that entrypoint before constructing a session, so an incomplete native
 * build surfaces the SDK's actionable link/build error.
 */
export function getEdgeNativeAvailability(): EdgeNativeAvailability {
  try {
    requireNativeElFfi();
    return { available: true };
  } catch (error) {
    return {
      available: false,
      message:
        error instanceof Error
          ? error.message
          : "edge-intelligence-sdk native module is unavailable.",
    };
  }
}

export function createEdgeChatSession(modelUri: string, tokenizerUri: string): EdgeLlmLike {
  const modelPath = toNativeModelPath(modelUri);
  const tokenizerPath = toNativeModelPath(tokenizerUri);
  if (!modelPath || !tokenizerPath) {
    throw new Error("Download the on-device language model and tokenizer before starting a chat.");
  }

  const availability = getEdgeNativeAvailability();
  if (!availability.available) {
    throw new Error(availability.message);
  }
  return localEdgeLlm(modelPath, tokenizerPath);
}
