import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { EdgeLlmLike } from "edge-intelligence-sdk";

import { fonts, tokens, type as typeScale } from "@/lib/ui/tokens";

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type ChatSession = Pick<EdgeLlmLike, "askStreamCb" | "reset">;

export function EdgeChat({ session }: { session: ChatSession }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const send = () => {
    const prompt = draft.trim();
    if (!prompt || isGenerating) return;

    const responseId = `${Date.now()}-assistant`;
    setDraft("");
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: "user", text: prompt },
      { id: responseId, role: "assistant", text: "" },
    ]);
    setIsGenerating(true);

    try {
      session.askStreamCb(prompt, {
        onToken(token) {
          setMessages((current) =>
            current.map((message) =>
              message.id === responseId
                ? { ...message, text: message.text + token }
                : message,
            ),
          );
        },
      });
    } catch {
      setMessages((current) =>
        current.map((message) =>
          message.id === responseId
            ? {
                ...message,
                text: t("chat.error", {
                  defaultValue: "I couldn't respond just now. Please try again.",
                }),
              }
            : message,
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const startNewConversation = () => {
    session.reset();
    setMessages([]);
  };

  return (
    <View className="flex-1 px-6">
      <View className="flex-row items-center justify-between pt-3">
        <Text style={{ color: tokens.text, fontFamily: fonts.display, ...typeScale.display }}>
          {t("chat.title", { defaultValue: "A quiet conversation" })}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("chat.newConversation", { defaultValue: "New conversation" })}
          onPress={startNewConversation}
          hitSlop={12}
        >
          <Text style={{ color: tokens.accent, fontFamily: fonts.bodyMedium, fontSize: 14 }}>
            {t("chat.new", { defaultValue: "New" })}
          </Text>
        </Pressable>
      </View>

      <Text style={{ color: tokens.textMute, fontFamily: fonts.body, ...typeScale.caption, marginTop: 8 }}>
        {t("chat.disclaimer", {
          defaultValue: "Private, on-device support — not a replacement for emergency care.",
        })}
      </Text>

      <ScrollView
        contentContainerStyle={{ gap: 12, paddingVertical: 24 }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <Text style={{ color: tokens.textMute, fontFamily: fonts.body, ...typeScale.body }}>
            {t("chat.empty", { defaultValue: "What feels most present for you right now?" })}
          </Text>
        )}
        {messages.map((message) => (
          <View
            key={message.id}
            style={{
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              backgroundColor: message.role === "user" ? tokens.accent : tokens.bgElev,
              borderRadius: 18,
              maxWidth: "88%",
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text
              style={{
                color: message.role === "user" ? tokens.bg : tokens.text,
                fontFamily: fonts.body,
                ...typeScale.body,
              }}
            >
              {message.text || "…"}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderTopColor: tokens.bgElev, paddingVertical: 16 }}>
        <TextInput
          accessibilityLabel={t("chat.messageLabel", { defaultValue: "Message" })}
          value={draft}
          onChangeText={setDraft}
          editable={!isGenerating}
          multiline
          placeholder={t("chat.placeholder", { defaultValue: "Write what is on your mind…" })}
          placeholderTextColor={tokens.textMute}
          style={{
            backgroundColor: tokens.bgElev,
            borderRadius: 16,
            color: tokens.text,
            fontFamily: fonts.body,
            minHeight: 52,
            paddingHorizontal: 14,
            paddingTop: 12,
            ...typeScale.body,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("chat.send", { defaultValue: "Send" })}
          disabled={!draft.trim() || isGenerating}
          onPress={send}
          style={{
            alignSelf: "flex-end",
            backgroundColor: !draft.trim() || isGenerating ? tokens.bgElev : tokens.accent,
            borderRadius: 14,
            marginTop: 10,
            paddingHorizontal: 20,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: !draft.trim() || isGenerating ? tokens.textMute : tokens.bg, fontFamily: fonts.bodyMedium }}>
            {isGenerating
              ? t("chat.thinking", { defaultValue: "Thinking…" })
              : t("chat.send", { defaultValue: "Send" })}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
