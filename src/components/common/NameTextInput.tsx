import { I18nManager, StyleProp, TextInput, TextStyle } from "react-native";
import { useTranslation } from "react-i18next";

import { fonts, tokens } from "@/lib/ui/tokens";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  style?: StyleProp<TextStyle>;
};

/** Styled name input shared by every screen that asks for it. Owns the RTL
 *  fix: under this app's native-RTL config, TextInput doesn't auto-flip
 *  textAlign the way Text does, so it's pinned explicitly here. */
export function NameTextInput({ value, onChangeText, onBlur, style }: Props) {
  const { t } = useTranslation();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      placeholder={t("setup.namePlaceholder")}
      placeholderTextColor={tokens.textMute + "88"}
      autoCapitalize="words"
      autoCorrect={false}
      returnKeyType="done"
      onSubmitEditing={onBlur}
      style={[
        {
          color: tokens.text,
          fontFamily: fonts.body,
          fontSize: 18,
          borderBottomWidth: 1,
          borderBottomColor: tokens.textMute + "55",
          paddingVertical: 8,
          textAlign: I18nManager.isRTL ? "right" : "left",
        },
        style,
      ]}
    />
  );
}
