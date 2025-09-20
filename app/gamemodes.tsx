import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { MenuButton, PlayerSwitcher } from "../src/ui";
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
        <View style={styles.titleRow}>
          <Text style={styles.title}>Choose your challenge</Text>
          <PlayerSwitcher style={styles.switcher} />
        </View>
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
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: {
    color: palette.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  switcher: { marginLeft: 16 },
  option: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: "#04110A",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
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
