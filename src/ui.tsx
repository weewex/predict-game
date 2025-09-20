import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { palette } from "./theme";
import { getPlayers, setActivePlayer, subscribeActivePlayer } from "./storage";
import type { PlayerProfile } from "./types";

export function PlayerSwitcher({
  style,
  onPlayerChange,
}: {
  style?: ViewStyle;
  onPlayerChange?: (player: PlayerProfile | null) => void;
}) {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [activePlayer, setActivePlayerState] = useState<PlayerProfile | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadPlayers = useCallback(async () => {
    try {
      const list = await getPlayers();
      setPlayers(list);
    } catch (error) {
      console.warn("Unable to load players", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlayers();
      return () => {
        setExpanded(false);
      };
    }, [loadPlayers])
  );

  React.useEffect(() => {
    const unsubscribe = subscribeActivePlayer((player) => {
      setActivePlayerState(player);
      onPlayerChange?.(player);
    });
    return unsubscribe;
  }, [onPlayerChange]);

  const hasPlayers = players.length > 0;
  const inactivePlayers = useMemo(
    () => players.filter((player) => player.id !== activePlayer?.id),
    [players, activePlayer?.id]
  );

  const handleSelect = useCallback(
    async (playerId: string) => {
      try {
        await setActivePlayer(playerId);
        await loadPlayers();
      } catch (error) {
        console.warn("Unable to switch active player", error);
      } finally {
        setExpanded(false);
      }
    },
    [loadPlayers]
  );

  const triggerLabel = activePlayer?.name ?? (hasPlayers ? "Select player" : "Add a player");
  const helperText = hasPlayers
    ? "Switch active player"
    : "No players yet · Tap to manage";

  return (
    <View style={[styles.switcherContainer, style]}>
      <TouchableOpacity
        style={[styles.switcherTrigger, expanded && styles.switcherTriggerActive]}
        onPress={() => {
          if (!hasPlayers) {
            router.push("/players");
            return;
          }
          setExpanded((prev) => !prev);
        }}
        activeOpacity={0.85}
      >
        <View>
          <Text style={styles.switcherLabel}>{triggerLabel}</Text>
          <Text style={styles.switcherHint}>{helperText}</Text>
        </View>
        <Text style={styles.switcherCaret}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.switcherDropdown}>
          <Text style={styles.switcherDropdownTitle}>Active player</Text>
          <TouchableOpacity
            style={[styles.switcherItem, styles.switcherItemActive]}
            onPress={() => setExpanded(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.switcherItemName}>{activePlayer?.name ?? "None selected"}</Text>
            <Text style={styles.switcherItemMeta}>
              {activePlayer ? "Currently tracking scores" : "Scores won't save until one is active"}
            </Text>
          </TouchableOpacity>
          {inactivePlayers.map((player) => (
            <TouchableOpacity
              key={player.id}
              style={styles.switcherItem}
              onPress={() => handleSelect(player.id)}
              activeOpacity={0.85}
            >
              <Text style={styles.switcherItemName}>{player.name}</Text>
              <Text style={styles.switcherItemMeta}>Set active profile</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.switcherManage}
            onPress={() => {
              setExpanded(false);
              router.push("/players");
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.switcherManageText}>Manage players</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function MenuButton({
  title,
  onPress,
  style,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.btn, disabled && styles.btnDisabled, style]}
      activeOpacity={0.82}
      disabled={disabled}
    >
      <Text style={styles.btnText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: palette.accent,
    borderRadius: 12,
    marginVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.accentMuted,
    shadowColor: "#03140C",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: { color: palette.textPrimary, fontSize: 16, fontWeight: "700" },
  switcherContainer: {
    position: "relative",
  },
  switcherTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 180,
  },
  switcherTriggerActive: {
    borderColor: palette.accent,
  },
  switcherLabel: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  switcherHint: {
    color: palette.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  switcherCaret: {
    color: palette.textSecondary,
    fontSize: 12,
    marginLeft: 12,
  },
  switcherDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    marginTop: 8,
    shadowColor: "#04060A",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 20,
  },
  switcherDropdownTitle: {
    color: palette.textSecondary,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  switcherItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 8,
    backgroundColor: palette.surfaceAlt,
  },
  switcherItemActive: {
    borderColor: palette.accent,
    backgroundColor: palette.surfaceAlt,
  },
  switcherItemName: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  switcherItemMeta: {
    color: palette.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  switcherManage: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: palette.surfaceAlt,
  },
  switcherManageText: {
    color: palette.accent,
    fontWeight: "700",
    fontSize: 13,
  },
});
