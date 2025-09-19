import React from "react";
import { View, StyleSheet, BackHandler, Text } from "react-native";
import { router } from "expo-router";
import { MenuButton } from "../src/ui";
import { palette } from "../src/theme";

export default function MainMenuScreen() {
  return (
    <View style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Predict Aim</Text>
        <Text style={styles.subtitle}>Sharpen your prediction timing across dynamic targets.</Text>
        <View style={styles.buttonGroup}>
          <MenuButton title="Play" onPress={() => router.push("/gamemodes")} style={styles.menuBtn} />
          <MenuButton title="Leaderboard" onPress={() => router.push("/leaderboard")} style={styles.menuBtn} />
          <MenuButton title="Exit" onPress={() => BackHandler.exitApp()} style={styles.menuBtn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { color: palette.textPrimary, fontSize: 30, fontWeight: "800" },
  subtitle: { color: palette.textSecondary, fontSize: 14, marginTop: 8, marginBottom: 28 },
  buttonGroup: {},
  menuBtn: { marginVertical: 6 },
});
