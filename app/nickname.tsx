import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { saveNickname } from "../src/storage";
import { MenuButton } from "../src/ui";
import { palette } from "../src/theme";

export default function NicknameScreen() {
  const [name, setName] = useState("");
  const valid = name.trim().length >= 3;

  async function onContinue() {
    if (!valid) return;
    await saveNickname(name);
    router.replace("/main");
  }

  return (
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>Pick a nickname</Text>
        <TextInput
          placeholder="At least 3 characters"
          placeholderTextColor={palette.textSecondary}
          style={styles.input}
          value={name}
          onChangeText={setName}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
        <MenuButton title="Continue" onPress={onContinue} style={{ opacity: valid ? 1 : 0.4 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { color: palette.textPrimary, fontSize: 24, fontWeight: "700", marginBottom: 12 },
  input: {
    backgroundColor: palette.surface,
    color: palette.textPrimary,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 16,
  },
});
