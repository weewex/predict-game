import React from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { MenuButton } from "../src/ui";

export default function GamemodeScreen() {
  return (
    <View style={styles.safe}>
      <View style={styles.container}>
        <MenuButton title="Simple (Guess X)" onPress={() => router.push("/simple")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B10" },
  container: { flex: 1, justifyContent: "center", padding: 20 },
});
