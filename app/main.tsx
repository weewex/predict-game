import React, { useCallback, useState } from "react";
import { View, StyleSheet, BackHandler, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { MenuButton } from "../src/ui";
import { palette } from "../src/theme";
import { getActivePlayer } from "../src/storage";
import type { PlayerProfile } from "../src/types";

export default function MainMenuScreen() {
  const [activePlayer, setActivePlayer] = useState<PlayerProfile | null>(null);

  const refreshActivePlayer = useCallback(() => {
    let cancelled = false;
    (async () => {
      const profile = await getActivePlayer();
      if (!cancelled) {
        setActivePlayer(profile);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(refreshActivePlayer);

  return (
    <View style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Predict Aim</Text>
        <Text style={styles.subtitle}>Sharpen your prediction timing across dynamic targets.</Text>
        <View style={styles.playerCard}>
          <Text style={styles.playerCardLabel}>Active player</Text>
          <Text style={styles.playerCardName}>{activePlayer?.name ?? "None selected"}</Text>
          <Text style={styles.playerCardHint}>Scores are saved to the active profile.</Text>
        </View>
        <View style={styles.buttonGroup}>
          <MenuButton title="Manage players" onPress={() => router.push("/players")} style={styles.menuBtn} />
          <MenuButton
            title="Play"
            onPress={() => router.push("/gamemodes")}
            style={styles.menuBtn}
            disabled={!activePlayer}
          />
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
  subtitle: { color: palette.textSecondary, fontSize: 14, marginTop: 8, marginBottom: 24 },
  playerCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 24,
  },
  playerCardLabel: {
    color: palette.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  playerCardName: {
    color: palette.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 6,
  },
  playerCardHint: { color: palette.textSecondary, fontSize: 12, marginTop: 4 },
  buttonGroup: { marginTop: 4 },
  menuBtn: { marginVertical: 6 },
});
