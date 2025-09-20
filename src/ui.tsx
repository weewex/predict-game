import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import { palette } from "./theme";
export function MenuButton({
  title,
  onPress,
  style,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.btn, disabled && styles.btnDisabled, style]}
      activeOpacity={0.82}
      disabled={disabled}
    >
      <Text style={styles.btnText}>{title}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: palette.accent,
    borderRadius: 12,
    marginVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.accentMuted,
    shadowColor: "#03140C",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: { color: palette.textPrimary, fontSize: 16, fontWeight: "700" },
});
