import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { saveNickname } from "../src/storage";
import { MenuButton } from "../src/ui";

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
          placeholderTextColor="#A3A8C3"
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
  safe: { flex: 1, backgroundColor: "#0B0B10" },
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { color: "#ECEFF4", fontSize: 22, fontWeight: "700", marginBottom: 12 },
  input: {
    backgroundColor: "#141420",
    color: "#ECEFF4",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#23233A",
    marginBottom: 16,
  },
});
