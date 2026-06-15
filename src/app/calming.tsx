import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { CalmingProtocol } from "@/components/features/calming/CalmingProtocol";
import { CrisisAffordance } from "@/components/features/crisis/CrisisAffordance";
import { Icon } from "@/components/common/Icon";
import { useSessionStore } from "@/lib/storage/session-store";
import { tokens } from "@/lib/ui/tokens";

/** Self-tap calming protocol (B-03 v1). Reached from:
 *  - the in-session "I need a moment" affordance (replaces the session route)
 *  - the Home "Need a moment?" button (pushes onto the stack)
 *
 *  On completion: records `lastEndedBy = "calming-protocol"` and routes to
 *  /after via `replace`. The user can also exit mid-flow via the close
 *  affordance, which routes to /home (no recorded session-end since they
 *  didn't finish the protocol). Per UI QA: the "no mid-flow exit" constraint
 *  from the original spec was dropped in favor of user control. */
export default function Calming() {
  const router = useRouter();
  const setLastEndedBy = useSessionStore((s) => s.setLastEndedBy);

  function handleProtocolEnd() {
    setLastEndedBy("calming-protocol");
    router.replace("/after");
  }

  function handleExit() {
    router.replace("/home");
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Header — nav element (close) on the leading edge, crisis on the
          trailing edge. Same LTR/RTL convention as Setup/Home/Session. */}
      <View className="flex-row justify-between items-center pt-2 px-8">
        <Pressable hitSlop={16} onPress={handleExit} accessibilityLabel="exit calming">
          <Icon name="close" size={20} color={tokens.text} />
        </Pressable>
        <CrisisAffordance />
      </View>
      <CalmingProtocol onProtocolEnd={handleProtocolEnd} />
    </SafeAreaView>
  );
}
