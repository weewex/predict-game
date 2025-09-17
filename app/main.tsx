import React from "react";
import { View, StyleSheet, BackHandler } from "react-native";
import { router } from "expo-router";
import { MenuButton } from "../src/ui";

export default function MainMenuScreen() {
  return (
    <View style={styles.safe}>
      <View style={styles.container}>
        <MenuButton title="Play" onPress={() => router.push("/gamemodes")} />
        <MenuButton title="Leaderboard" onPress={() => router.push("/leaderboard")} />
        <MenuButton title="Exit" onPress={() => BackHandler.exitApp()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B10" },
  container: { flex: 1, justifyContent: "center", padding: 20 },
});
