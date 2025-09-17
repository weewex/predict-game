import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
export function MenuButton({ title, onPress, style }: { title: string; onPress: () => void; style?: ViewStyle }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, style]} activeOpacity={0.8}>
      <Text style={styles.btnText}>{title}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    marginVertical: 8,
    alignItems: "center",
  },
  btnText: { color: "#ECEFF4", fontSize: 16, fontWeight: "700" },
});
