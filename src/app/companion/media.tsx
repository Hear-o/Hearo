import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/common/Icon";
import { CompanionTaskMedia, getCompanionTaskMedia } from "@/lib/storage/storage";
import { usePageFade } from "@/lib/ui/fadeTransition";
import { fonts, tokens } from "@/lib/ui/tokens";

/** Full-screen viewer for a Companion step's attached photo or video. Reached
 *  by tapping a step's thumbnail on the roadmap. Media is loaded from the local
 *  store by task key; nothing is fetched from the network. */
export default function CompanionMediaViewer() {
  const router = useRouter();
  const { t } = useTranslation();
  const { animatedStyle, transition } = usePageFade();
  const { task } = useLocalSearchParams<{ task?: string }>();
  // undefined = still loading; null = no media for this key (e.g. removed).
  const [media, setMedia] = useState<CompanionTaskMedia | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void getCompanionTaskMedia().then((map) => {
      if (active) setMedia(task ? (map[task] ?? null) : null);
    });
    return () => {
      active = false;
    };
  }, [task]);

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.sceneOverlayBottom }}>
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 8,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Pressable onPress={() => transition(() => router.back())} hitSlop={12}>
          <Icon name="arrow-left" size={22} color={tokens.sceneText} />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {media === undefined ? null : media === null ? (
          <Text
            style={{
              color: tokens.sceneTextMute,
              fontFamily: fonts.body,
              fontSize: 15,
              paddingHorizontal: 32,
              textAlign: "center",
            }}
          >
            {t("companion.mediaMissing")}
          </Text>
        ) : media.type === "video" ? (
          <VideoPlayer uri={media.uri} />
        ) : (
          <Image
            source={{ uri: media.uri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
            transition={150}
          />
        )}
      </View>
    </SafeAreaView>
    </Animated.View>
  );
}

/** Isolated so useVideoPlayer only mounts once we actually have a video uri
 *  (hooks can't be called conditionally in the parent while media loads). */
function VideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%" }}
      contentFit="contain"
      nativeControls
    />
  );
}
