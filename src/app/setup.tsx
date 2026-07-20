import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/components/common/ScreenHeader";
import { ForwardCta } from "@/components/common/ForwardCta";
import { ForwardCtaFooter } from "@/components/common/ForwardCtaFooter";
import { Icon } from "@/components/common/Icon";
import { SceneCarousel } from "@/components/features/setup/SceneCarousel";
import { getScene, getSound, localize } from "@/lib/content/content";
import { useSessionStore, SessionDurationMinutes } from "@/lib/storage/session-store";
import { fonts, tokens, type as typeScale } from "@/lib/ui/tokens";

const DURATION_CHOICES: SessionDurationMinutes[] = [3, 5, 7];

// v1.0.9 — Name input + Reminder schedule moved out of Setup and into the
// global SettingsSheet (gear icon on Home). Setup is now focused only on
// the session-content prefs: scene + consented sounds.
//
// v1.1.x — the trigger picker is scene-filtered: each Scene declares which
// SoundKeys make sense in its context (helicopter at a cafe doesn't), and
// the grid only renders that subset. Scene change auto-deselects any
// previously-picked sound that's not in the new scene's list (logic in
// session-store.setScene).

function Check({ selected }: { selected: boolean }) {
  return (
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: selected ? tokens.accent : tokens.textMute,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? tokens.accent : "transparent",
      }}
    >
      {selected ? (
        <Text style={{ color: tokens.bg, fontSize: 12, lineHeight: 12 }}>✓</Text>
      ) : null}
    </View>
  );
}

export default function Setup() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { scene, sounds, durationMinutes, setScene, toggleSound, setDurationMinutes } =
    useSessionStore();

  // Filter the trigger grid to the current scene's candidate list — keeps
  // implausible combos (helicopter at a cafe) out of the picker entirely.
  const visibleSounds = getScene(scene).triggerCandidates.map(getSound);

  const handleReady = () => {
    if (sounds.length === 0) return;
    // v1.1.0 update: Setup is now part of the begin-a-session flow (reached
    // via /home Begin), so Ready → /ready (preview screen with scene image),
    // not back to /home. The user can still revisit /setup later via the
    // "Change what's planned" link on /home or /ready.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push("/ready" as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Setup is a form with a horizontal scene carousel, scrollable
          checkboxes, a text input, and a time picker. A screen-level
          swipe-forward GestureDetector here would collide with the
          carousel's pan recognizer — see #58 review. Users tap "Ready"
          (or swipe forward from /home once they reach it) instead. */}
      <View className="flex-1">
      {/* Nav element on the leading edge — LEFT in LTR, RIGHT in RTL.
          Crisis on the trailing edge. flex-row auto-flips via I18nManager.
          Fixed above the ScrollView so the crisis affordance stays reachable
          while scrolling instead of scrolling out of view. */}
      <ScreenHeader
        left={
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Icon name="arrow-left" size={22} color={tokens.accent} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={true}
      >
        <View className="px-8 pt-6">
          <View style={{ width: 28, height: 1, backgroundColor: tokens.accent }} />
        </View>

        <Text
          style={{
            color: tokens.text,
            fontFamily: fonts.display,
            ...typeScale.hero,
            marginTop: 24,
            marginBottom: 24,
            paddingHorizontal: 32,
          }}
        >
          {t("setup.sceneQuestion")}
        </Text>

        <SceneCarousel value={scene} onChange={setScene} lang={i18n.language} />

        <View className="px-8 pt-12">
          <View style={{ width: 28, height: 1, backgroundColor: tokens.textMute, opacity: 0.5 }} />
        </View>

        <Text
          style={{
            color: tokens.textMute,
            fontFamily: fonts.body,
            fontSize: 15,
            lineHeight: 24,
            textAlign: "left",
            paddingHorizontal: 32,
            marginTop: 20,
            marginBottom: 16,
          }}
        >
          {t("setup.soundsIntro")}
        </Text>

        <Text
          style={{
            color: tokens.text,
            fontFamily: fonts.display,
            ...typeScale.hero,
            marginBottom: 8,
            paddingHorizontal: 32,
          }}
        >
          {t("setup.soundsQuestion")}
        </Text>

        <Text
          style={{
            color: tokens.textMute,
            fontFamily: fonts.body,
            ...typeScale.body,
            paddingHorizontal: 32,
            marginBottom: 16,
          }}
        >
          {t("setup.soundsHint")}
        </Text>

        {/* v1.1.x — Trigger picker as a single-column row list. Each row shows
            a clearly-sized thumbnail of the illustration on the leading edge,
            the label, and a check on the trailing edge. Selected rows get an
            accent border. The earlier 2-col grid had cards rendering too
            narrow on phone with the illustrations cropped unreadably. */}
        <View style={{ paddingHorizontal: 24, gap: 10 }}>
          {visibleSounds.map((s) => {
            const selected = sounds.includes(s.key);
            return (
              <Pressable
                key={s.key}
                onPress={() => toggleSound(s.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={localize(s.label, i18n.language)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: selected ? tokens.accent : tokens.textMute + "33",
                  borderRadius: 14,
                  backgroundColor: tokens.bgElev,
                }}
              >
                {/* v1.1.10: JSX order [check, text, image]. In LTR that
                    renders as [check, text, image] left-to-right; in RTL
                    (flex-row auto-flip to row-reverse) it renders as
                    [image, text, check] right-to-left — i.e. image on
                    LEFT, check on RIGHT. Matches Hili's request. */}
                <Check selected={selected} />
                <Text
                  style={{
                    color: selected ? tokens.text : tokens.textMute,
                    fontFamily: fonts.body,
                    fontSize: 17,
                    flex: 1,
                    textAlign: "left",
                  }}
                  numberOfLines={1}
                >
                  {localize(s.label, i18n.language)}
                </Text>
                {s.image ? (
                  <Image
                    source={s.image}
                    style={{
                      width: 78,
                      height: 60,
                      borderRadius: 8,
                      opacity: selected ? 1 : 0.85,
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 78,
                      height: 60,
                      borderRadius: 8,
                      backgroundColor: tokens.textMute + "22",
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        <View className="px-8 pt-12">
          <View style={{ width: 28, height: 1, backgroundColor: tokens.textMute, opacity: 0.5 }} />
        </View>

        <Text
          style={{
            color: tokens.text,
            fontFamily: fonts.display,
            ...typeScale.hero,
            marginTop: 24,
            marginBottom: 8,
            paddingHorizontal: 32,
          }}
        >
          {t("setup.durationQuestion")}
        </Text>

        <Text
          style={{
            color: tokens.textMute,
            fontFamily: fonts.body,
            ...typeScale.body,
            paddingHorizontal: 32,
            marginBottom: 16,
          }}
        >
          {t("setup.durationHint")}
        </Text>

        {/* Chip row — three short pill buttons, accent border + filled when
            selected. Keeping this as plain Pressables (no separate component)
            since it's a one-off picker with three static choices. */}
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 32 }}>
          {DURATION_CHOICES.map((m) => {
            const selected = durationMinutes === m;
            return (
              <Pressable
                key={m}
                onPress={() => setDurationMinutes(m)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={t("setup.durationMinutes", { count: m })}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: selected ? tokens.accent : tokens.textMute + "55",
                  borderRadius: 999,
                  backgroundColor: selected ? tokens.accent : "transparent",
                }}
              >
                <Text
                  style={{
                    color: selected ? tokens.bg : tokens.text,
                    fontFamily: fonts.body,
                    fontSize: 17,
                  }}
                >
                  {t("setup.durationMinutes", { count: m })}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="px-8 pt-12 pb-6">
          <Pressable
            onPress={() => router.push("/psychoed")}
            hitSlop={8}
            style={{ paddingBottom: 4 }}
          >
            <Text
              style={{
                color: tokens.textMute,
                fontFamily: fonts.body,
                fontSize: 14,
                textAlign: "left",
              }}
            >
              {t("setup.rereadIntro")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <ForwardCtaFooter>
        <ForwardCta
          label={t("setup.ready")}
          onPress={handleReady}
          disabled={sounds.length === 0}
        />
      </ForwardCtaFooter>
      </View>
    </SafeAreaView>
  );
}
