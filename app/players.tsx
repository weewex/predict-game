import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { addPlayer, getActivePlayer, getPlayers, setActivePlayer } from "../src/storage";
import type { PlayerProfile } from "../src/types";
import { MenuButton } from "../src/ui";
import { palette } from "../src/theme";

export default function PlayersScreen() {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, active] = await Promise.all([getPlayers(), getActivePlayer()]);
      setPlayers(list);
      setActiveId(active?.id ?? null);
      setError(null);
    } catch (err) {
      console.warn("Failed to load players", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const valid = name.trim().length >= 3;
  const helperText = useMemo(() => {
    if (players.length === 0) {
      return "Create at least one player to start tracking scores.";
    }
    if (!activeId) {
      return "Tap on a player below to make them active.";
    }
    return "Tap on a player to switch who is active.";
  }, [players.length, activeId]);

  const handleSelect = async (playerId: string) => {
    try {
      await setActivePlayer(playerId);
      setActiveId(playerId);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Unable to select player");
    }
  };

  const handleAdd = async () => {
    if (!valid) return;
    try {
      setError(null);
      const hadPlayers = players.length > 0;
      await addPlayer(name);
      setName("");
      await load();
      if (!hadPlayers) {
        router.replace("/main");
      }
    } catch (err: any) {
      setError(err?.message ?? "Unable to add player");
    }
  };

  const handleContinue = () => {
    if (!players.length) return;
    router.replace("/main");
  };

  const renderJoined = (player: PlayerProfile) => {
    try {
      const date = new Date(player.createdAt);
      if (Number.isNaN(date.getTime())) {
        return "Unknown join date";
      }
      return `Joined ${date.toLocaleDateString()}`;
    } catch {
      return "Joined recently";
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Manage players</Text>
        <Text style={styles.subtitle}>{helperText}</Text>

        <View style={styles.playerList}>
          {players.length ? (
            players.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={[styles.playerItem, activeId === player.id && styles.playerItemActive]}
                onPress={() => handleSelect(player.id)}
                activeOpacity={0.85}
              >
                <View style={styles.playerHeader}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  {activeId === player.id && <Text style={styles.activeBadge}>Active</Text>}
                </View>
                <Text style={styles.playerMeta}>{renderJoined(player)}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.empty}>No players yet. Add one below to get started.</Text>
          )}
        </View>

        <View style={styles.addCard}>
          <Text style={styles.sectionTitle}>Add a player</Text>
          <TextInput
            placeholder="Player name"
            placeholderTextColor={palette.textSecondary}
            style={styles.input}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={24}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <MenuButton title="Save player" onPress={handleAdd} disabled={!valid} />
        </View>

        <MenuButton
          title={players.length ? "Back to menu" : "Add a player to continue"}
          onPress={handleContinue}
          disabled={!players.length}
          style={styles.footerButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  container: { flexGrow: 1, padding: 24, paddingBottom: 48 },
  title: { color: palette.textPrimary, fontSize: 26, fontWeight: "700" },
  subtitle: { color: palette.textSecondary, fontSize: 14, marginTop: 6, marginBottom: 20 },
  playerList: { marginBottom: 24 },
  playerItem: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    marginBottom: 12,
  },
  playerItemActive: {
    borderColor: palette.accent,
    backgroundColor: palette.surfaceAlt,
  },
  playerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  playerName: { color: palette.textPrimary, fontSize: 16, fontWeight: "700" },
  activeBadge: {
    backgroundColor: palette.accent,
    color: palette.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  playerMeta: { color: palette.textSecondary, fontSize: 12, marginTop: 6 },
  empty: {
    color: palette.textSecondary,
    padding: 20,
    textAlign: "center",
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  addCard: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: { color: palette.textPrimary, fontSize: 18, fontWeight: "600", marginBottom: 12 },
  input: {
    backgroundColor: palette.surface,
    color: palette.textPrimary,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  error: { color: palette.negative, marginTop: 10, marginBottom: 4 },
  footerButton: { marginTop: 10 },
});
