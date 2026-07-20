import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { CalmingProtocol } from "@/components/features/calming/CalmingProtocol";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { Icon } from "@/components/common/Icon";
import { useCalmingOverlay } from "@/hooks/useCalmingOverlay";
import { useSessionStore } from "@/lib/storage/session-store";
import { tokens } from "@/lib/ui/tokens";

/** Self-tap calming protocol (B-03 v1, updated v1.1.0). Reached from:
 *  - the in-session "I need a moment" affordance (push, /session stays mounted
 *    underneath and resumes when we router.back())
 *  - the Home "Need a moment?" button (push from /home)
 *
 *  v1.1.0 change: completion + exit both router.back() so we return to
 *  whatever screen called us. /session detects the focus regain and resumes
 *  the audio graph + timer. The previous "end the session entirely from
 *  calming" semantics moved to /session's End-session button; this screen
 *  is now strictly a pause-and-return overlay. */
export default function Calming() {
  const router = useRouter();
  const { t } = useTranslation();
  const setLastEndedBy = useSessionStore((s) => s.setLastEndedBy);

  // v1.1.x — soothing soundtrack under the protocol (Roy's neo-classical
  // calming track, looped at low volume). Spins up its own AudioContext so
  // it doesn't touch the suspended session engine while we're on this
  // screen; tears down on unmount.
  useCalmingOverlay();

  function handleProtocolEnd() {
    setLastEndedBy("calming-protocol");
    router.back();
  }

  function handleExit() {
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Header — nav element (close) on the leading edge, crisis on the
          trailing edge. Same LTR/RTL convention as Setup/Home/Session. */}
      <ScreenHeader
        left={
          <Pressable hitSlop={16} onPress={handleExit} accessibilityLabel={t("calming.exit")}>
            <Icon name="close" size={22} color={tokens.text} />
          </Pressable>
        }
      />
      <CalmingProtocol onProtocolEnd={handleProtocolEnd} />
    </SafeAreaView>
  );
}
