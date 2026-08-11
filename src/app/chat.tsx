import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EdgeChat } from "@/components/features/chat/EdgeChat";
import { createEdgeChatSession, getEdgeErrorMessage } from "@/lib/chat/edgeChat";
import {
  EDGE_MODEL_SIZE_BYTES,
  getInstalledEdgeModelAssets,
  installEdgeModelAssets,
} from "@/lib/chat/modelStore";
import { fonts, tokens, type as typeScale } from "@/lib/ui/tokens";

const MODEL_DOWNLOAD_MB = Math.round(EDGE_MODEL_SIZE_BYTES / 1024 / 1024);

export default function Chat() {
  const [modelAssets, setModelAssets] = useState<{ modelUri: string; tokenizerUri: string } | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getInstalledEdgeModelAssets()
      .then((assets) => {
        if (active) setModelAssets(assets);
      })
      .catch(() => {
        if (active) setSetupError("We couldn't check the language model on this device.");
      })
      .finally(() => {
        if (active) setIsChecking(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const downloadModel = useCallback(async () => {
    setIsDownloading(true);
    setSetupError(null);
    setDownloadedBytes(0);

    try {
      const assets = await installEdgeModelAssets(({ bytesWritten }) => {
        setDownloadedBytes(bytesWritten);
      });
      setModelAssets(assets);
    } catch (error) {
      setSetupError(
        error instanceof Error
          ? error.message
          : "The language model could not be downloaded. Please try again.",
      );
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const result = useMemo(() => {
    if (!modelAssets) return { session: null, error: null };

    try {
      return { session: createEdgeChatSession(modelAssets.modelUri, modelAssets.tokenizerUri), error: null };
    } catch (error) {
      return {
        session: null,
        error: getEdgeErrorMessage(error),
      };
    }
  }, [modelAssets]);

  if (result.session) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <EdgeChat session={result.session} />
      </SafeAreaView>
    );
  }

  const progress = Math.min(100, Math.round((downloadedBytes / EDGE_MODEL_SIZE_BYTES) * 100));
  const message = result.error ?? setupError;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 justify-center px-8">
        <Text style={{ color: tokens.text, fontFamily: fonts.display, ...typeScale.display }}>
          {isChecking ? "Preparing your private assistant" : "Set up your private assistant"}
        </Text>
        <Text style={{ color: tokens.textMute, fontFamily: fonts.body, ...typeScale.body, marginTop: 12 }}>
          {isChecking
            ? "Checking this device for the on-device language model…"
            : `Download the ${MODEL_DOWNLOAD_MB} MB language model once. Conversations stay on this device.`}
        </Text>

        {message ? (
          <Text style={{ color: tokens.accent, fontFamily: fonts.body, ...typeScale.body, marginTop: 18 }}>
            {message}
          </Text>
        ) : null}

        {isDownloading ? (
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: tokens.text, fontFamily: fonts.bodyMedium, ...typeScale.body }}>
              Downloading model — {progress}%
            </Text>
            <View style={{ backgroundColor: tokens.bgElev, borderRadius: 999, height: 8, marginTop: 10 }}>
              <View style={{ backgroundColor: tokens.accent, borderRadius: 999, height: 8, width: `${progress}%` }} />
            </View>
          </View>
        ) : null}

        {!isChecking && !result.error ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Download on-device language model"
            disabled={isDownloading}
            onPress={downloadModel}
            style={{
              alignSelf: "flex-start",
              backgroundColor: isDownloading ? tokens.bgElev : tokens.accent,
              borderRadius: 14,
              marginTop: 24,
              paddingHorizontal: 20,
              paddingVertical: 13,
            }}
          >
            <Text style={{ color: tokens.bg, fontFamily: fonts.bodyMedium, ...typeScale.body }}>
              {isDownloading ? "Downloading…" : "Download model"}
            </Text>
          </Pressable>
        ) : null}

        {result.error ? (
          <Text style={{ color: tokens.textMute, fontFamily: fonts.body, ...typeScale.caption, marginTop: 12 }}>
            Rebuild the native development app after installing the SDK. Expo Go cannot load this native module.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
