import React from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { MenuButton } from "../src/ui";
import { palette } from "../src/theme";

const modes = [
  {
    title: "Simple",
    subtitle: "Static archery target. Remember its spot.",
    path: "/simple",
  },
  {
    title: "Normal",
    subtitle: "Horizontal glide. Predict the slide while blind.",
    path: "/normal",
  },
  {
    title: "Pro",
    subtitle: "Full-field movement. Track both axes at once.",
    path: "/pro",
  },
  {
    title: "Extreme",
    subtitle: "Two targets at once. Double the challenge.",
    path: "/extreme",
  },
];

const extras = [
  {
    title: "Local Multiplayer",
    subtitle: "Face off across three rounds of five shots each.",
    path: "/local",
  },
];

export default function GamemodeScreen() {
  return (
    <View style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.backText}>Back to menu</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Choose your challenge</Text>
        {modes.map((mode) => (
          <View key={mode.title} style={styles.option}>
            <MenuButton title={mode.title} onPress={() => router.push(mode.path)} style={styles.optionButton} />
            <Text style={styles.subtitle}>{mode.subtitle}</Text>
          </View>
        ))}
        <Text style={styles.sectionLabel}>Party modes</Text>
        {extras.map((mode) => (
          <View key={mode.title} style={styles.option}>
            <MenuButton title={mode.title} onPress={() => router.push(mode.path)} style={styles.optionButton} />
            <Text style={styles.subtitle}>{mode.subtitle}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  backButton: { alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 2, marginBottom: 12 },
  backText: { color: palette.textSecondary, fontSize: 13 },
  title: {
    color: palette.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 12,
  },
  option: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  optionButton: {
    marginVertical: 0,
  },
  subtitle: {
    color: palette.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  sectionLabel: {
    color: palette.textSecondary,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 10,
  },
});
