import React, { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { GameScreen, GameAttemptResult } from "../src/gameplay";
import { MenuButton, PlayerSwitcher } from "../src/ui";
import { palette } from "../src/theme";
import { getPlayers, setActivePlayer } from "../src/storage";
import type { GameMode, PlayerProfile } from "../src/types";

const ROUNDS = 3;
const TRIES_PER_ROUND = 5;

const modeOptions: { key: GameMode; label: string; description: string }[] = [
  { key: "SIMPLE", label: "Simple", description: "Static target" },
  { key: "NORMAL", label: "Normal", description: "Horizontal motion" },
  { key: "PRO", label: "Pro", description: "Full-field motion" },
  { key: "EXTREME", label: "Extreme", description: "Dual targets" },
];

type TurnState = { round: number; shot: number; playerIndex: number };

type SessionRecords = Record<string, GameAttemptResult[][]>;

export default function LocalMultiplayerScreen() {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sessionMode, setSessionMode] = useState<GameMode>("NORMAL");
  const [sessionPlayers, setSessionPlayers] = useState<PlayerProfile[]>([]);
  const [sessionRecords, setSessionRecords] = useState<SessionRecords>({});
  const [turn, setTurn] = useState<TurnState>({ round: 0, shot: 0, playerIndex: 0 });
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [awaitingAdvance, setAwaitingAdvance] = useState(false);
  const [advanceLabel, setAdvanceLabel] = useState("Next attempt");
  const nextTurnRef = useRef<TurnState | null>(null);

  const loadPlayers = useCallback(async () => {
    try {
      const list = await getPlayers();
      setPlayers(list);
      if (!list.length) {
        setSelectedIds([]);
      }
    } catch (error) {
      console.warn("Failed to load players", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlayers();
    }, [loadPlayers])
  );

  const togglePlayer = (playerId: string) => {
    setSelectedIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const selectedPlayers = useMemo(
    () => players.filter((player) => selectedIds.includes(player.id)),
    [players, selectedIds]
  );

  const createEmptyRecords = useCallback(
    (participants: PlayerProfile[]): SessionRecords => {
      return participants.reduce((acc, player) => {
        acc[player.id] = Array.from({ length: ROUNDS }, () => [] as GameAttemptResult[]);
        return acc;
      }, {} as SessionRecords);
    },
    []
  );

  const standings = useMemo(() => {
    if (!sessionPlayers.length) return [];
    return sessionPlayers
      .map((player) => {
        const rounds = sessionRecords[player.id] ?? Array.from({ length: ROUNDS }, () => [] as GameAttemptResult[]);
        const averages = rounds.map((attempts) =>
          attempts.length
            ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length)
            : null
        );
        const total = averages.reduce((sum, value) => sum + (value ?? 0), 0);
        return { player, rounds, averages, total };
      })
      .sort((a, b) => b.total - a.total);
  }, [sessionPlayers, sessionRecords]);

  const currentPlayer = sessionPlayers[turn.playerIndex];

  const handleStartSession = useCallback(async () => {
    const participants = selectedPlayers;
    if (participants.length < 2) {
      return;
    }
    setSessionPlayers(participants);
    setSessionRecords(createEmptyRecords(participants));
    setTurn({ round: 0, shot: 0, playerIndex: 0 });
    setSessionComplete(false);
    setSessionActive(true);
    setAwaitingAdvance(false);
    setAdvanceLabel("Next attempt");
    try {
      await setActivePlayer(participants[0].id);
    } catch (error) {
      console.warn("Unable to set active player", error);
    }
  }, [selectedPlayers, createEmptyRecords]);

  const handleAttemptComplete = useCallback(
    (attempt: GameAttemptResult) => {
      const player = sessionPlayers[turn.playerIndex];
      if (!player) return;

      setSessionRecords((prev) => {
        const next: SessionRecords = { ...prev };
        const rounds = next[player.id]?.map((round) => [...round]) ?? Array.from({ length: ROUNDS }, () => [] as GameAttemptResult[]);
        rounds[turn.round] = [...rounds[turn.round], attempt];
        next[player.id] = rounds;
        return next;
      });

      const nextShot = turn.shot + 1;
      let nextRound = turn.round;
      let nextPlayerIndex = turn.playerIndex;
      let nextShotIndex = turn.shot;
      let label = "Next attempt";
      let complete = false;

      if (nextShot >= TRIES_PER_ROUND) {
        nextShotIndex = 0;
        nextPlayerIndex += 1;
        if (nextPlayerIndex >= sessionPlayers.length) {
          nextPlayerIndex = 0;
          nextRound += 1;
          if (nextRound >= ROUNDS) {
            complete = true;
            label = "View results";
          } else {
            label = `Begin round ${nextRound + 1}`;
          }
        } else {
          label = `Next player · ${sessionPlayers[nextPlayerIndex].name}`;
        }
      } else {
        nextShotIndex = nextShot;
        label = `Shot ${nextShot + 1}`;
      }

      if (complete) {
        nextTurnRef.current = null;
        setSessionComplete(true);
      } else {
        nextTurnRef.current = { round: nextRound, playerIndex: nextPlayerIndex, shot: nextShotIndex };
      }

      setAdvanceLabel(label);
      setAwaitingAdvance(true);
    },
    [sessionPlayers, turn]
  );

  const handleAdvance = useCallback(
    async (reset?: () => void) => {
      if (!awaitingAdvance) return;
      if (sessionComplete) {
        setAwaitingAdvance(false);
        setSessionActive(false);
        return;
      }
      const nextTurn = nextTurnRef.current;
      if (!nextTurn) return;
      setTurn(nextTurn);
      setAwaitingAdvance(false);
      const nextPlayer = sessionPlayers[nextTurn.playerIndex];
      if (nextPlayer) {
        try {
          await setActivePlayer(nextPlayer.id);
        } catch (error) {
          console.warn("Unable to set active player", error);
        }
      }
      reset?.();
    },
    [awaitingAdvance, sessionComplete, sessionPlayers]
  );

  const turnLabel = sessionActive
    ? `Round ${turn.round + 1}/${ROUNDS} · Shot ${turn.shot + 1}/${TRIES_PER_ROUND}`
    : `Rounds: ${ROUNDS} · Shots per round: ${TRIES_PER_ROUND}`;

  return (
    <View style={styles.safe}>
      {sessionActive ? (
        <>
          <ScrollView style={styles.sessionScroll} contentContainerStyle={styles.sessionContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Local multiplayer</Text>
              <PlayerSwitcher style={styles.headerSwitcher} />
              <Text style={styles.subtitle}>{turnLabel}</Text>
              {currentPlayer && (
                <Text style={styles.currentPlayer}>{`Current shooter: ${currentPlayer.name}`}</Text>
              )}
            </View>
            <View style={styles.standingsCard}>
              <View style={styles.standingsHeader}>
                <Text style={styles.standingsTitle}>Scoreboard</Text>
              </View>
              {standings.map((entry) => {
                const isCurrent = sessionActive && currentPlayer && entry.player.id === currentPlayer.id;
                return (
                  <View key={entry.player.id} style={[styles.standingRow, isCurrent && styles.standingRowActive]}>
                    <Text style={styles.standingName}>{entry.player.name}</Text>
                    <View style={styles.standingRounds}>
                      {entry.averages.map((avg, index) => (
                        <Text
                          key={`${entry.player.id}-round-${index}`}
                          style={[styles.standingRoundValue, avg !== null ? styles.standingRoundValueFilled : styles.standingRoundValueEmpty]}
                        >
                          {avg !== null ? avg : "--"}
                        </Text>
                      ))}
                    </View>
                    <Text style={styles.standingTotal}>{entry.total}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.gameWrapper}>
            <GameScreen
              mode={sessionMode}
              persistScore={false}
              showPlayerSwitcher={false}
              onAttemptComplete={handleAttemptComplete}
              renderResultActions={({ reset }) => (
                <MenuButton
                  title={advanceLabel}
                  onPress={() => handleAdvance(sessionComplete ? undefined : reset)}
                  disabled={!awaitingAdvance}
                />
              )}
            />
          </View>
        </>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Local multiplayer</Text>
          <PlayerSwitcher style={styles.selectionSwitcher} />
          <Text style={styles.subtitle}>
            Select at least two players and a mode. Each competitor shoots {TRIES_PER_ROUND} times per round for {ROUNDS}
            rounds. Scores are averaged per round and summed to crown the champion.
          </Text>
          <View style={styles.section}> 
            <Text style={styles.sectionTitle}>Players</Text>
            {players.length ? (
              players.map((player) => {
                const isSelected = selectedIds.includes(player.id);
                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[styles.playerOption, isSelected && styles.playerOptionSelected]}
                    onPress={() => togglePlayer(player.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerHint}>{isSelected ? "Tap to remove" : "Tap to add"}</Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.emptyMessage}>Create players from the main menu to start competing.</Text>
            )}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Game mode</Text>
            <View style={styles.modeRow}>
              {modeOptions.map((mode, index) => {
                const isActive = sessionMode === mode.key;
                return (
                  <TouchableOpacity
                    key={mode.key}
                    style={[
                      styles.modeChip,
                      (index + 1) % 2 === 0 && styles.modeChipLast,
                      isActive && styles.modeChipActive,
                    ]}
                    onPress={() => setSessionMode(mode.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.modeChipLabel, isActive && styles.modeChipLabelActive]}>{mode.label}</Text>
                    <Text style={styles.modeChipHint}>{mode.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          {sessionComplete && standings.length > 0 && (
            <View style={styles.resultsBanner}>
              <Text style={styles.resultsTitle}>Last winners</Text>
              <Text style={styles.resultsText}>Champion: {standings[0].player.name}</Text>
            </View>
          )}
          <MenuButton
            title={selectedPlayers.length >= 2 ? "Start match" : "Pick at least two players"}
            onPress={handleStartSession}
            disabled={selectedPlayers.length < 2}
            style={styles.startButton}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  scroll: { flex: 1 },
  sessionScroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  sessionContent: { padding: 20, paddingBottom: 24 },
  title: { color: palette.textPrimary, fontSize: 26, fontWeight: "800", marginBottom: 12 },
  subtitle: { color: palette.textSecondary, fontSize: 13, marginBottom: 16, lineHeight: 18 },
  selectionSwitcher: { alignSelf: "flex-start", marginBottom: 12 },
  header: { marginBottom: 16 },
  headerSwitcher: { marginTop: 12, alignSelf: "flex-start" },
  currentPlayer: { color: palette.textPrimary, fontSize: 14, marginTop: 8 },
  section: { marginBottom: 24 },
  sectionTitle: { color: palette.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  playerOption: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    marginBottom: 12,
  },
  playerOptionSelected: {
    borderColor: palette.accent,
    backgroundColor: palette.surfaceAlt,
  },
  playerName: { color: palette.textPrimary, fontSize: 16, fontWeight: "700" },
  playerHint: { color: palette.textSecondary, fontSize: 12, marginTop: 4 },
  emptyMessage: { color: palette.textSecondary, fontSize: 13, textAlign: "center", paddingVertical: 20 },
  modeRow: { flexDirection: "row", flexWrap: "wrap" },
  modeChip: {
    width: "48%",
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    marginRight: "4%",
    marginBottom: 12,
  },
  modeChipLast: { marginRight: 0 },
  modeChipActive: { borderColor: palette.accent, backgroundColor: palette.surfaceAlt },
  modeChipLabel: { color: palette.textSecondary, fontSize: 13, fontWeight: "700" },
  modeChipLabelActive: { color: palette.textPrimary },
  modeChipHint: { color: palette.textSecondary, fontSize: 11, marginTop: 6 },
  startButton: { marginTop: 8 },
  standingsCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    marginBottom: 20,
  },
  standingsHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  standingsTitle: { color: palette.textPrimary, fontSize: 18, fontWeight: "700" },
  standingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  standingRowActive: {
    borderBottomWidth: 0,
    backgroundColor: palette.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  standingName: { color: palette.textPrimary, fontWeight: "700", flex: 1 },
  standingRounds: { flexDirection: "row", marginRight: 12 },
  standingRoundValue: {
    width: 54,
    textAlign: "center",
    borderRadius: 10,
    paddingVertical: 6,
    marginLeft: 6,
    fontSize: 13,
  },
  standingRoundValueFilled: { backgroundColor: palette.surfaceAlt, color: palette.textPrimary },
  standingRoundValueEmpty: { backgroundColor: palette.surface, color: palette.textSecondary, borderWidth: 1, borderColor: palette.border },
  standingTotal: { color: palette.textPrimary, fontSize: 16, fontWeight: "700", width: 48, textAlign: "right" },
  resultsBanner: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    marginBottom: 16,
  },
  resultsTitle: { color: palette.textPrimary, fontSize: 16, fontWeight: "700" },
  resultsText: { color: palette.textSecondary, marginTop: 4 },
  gameWrapper: { flex: 1, minHeight: 480 },
});
