import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getScores } from "../src/storage";
import type { ScorePayload } from "../src/types";
import { palette } from "../src/theme";

const modeLabels: Record<ScorePayload["mode"], string> = {
  SIMPLE: "Simple",
  NORMAL: "Normal",
  PRO: "Pro",
};

export default function LeaderboardScreen() {
  const [data, setData] = useState<ScorePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScores = useCallback(async () => {
    setLoading(true);
    try {
      const savedScores = await getScores();
      setData(savedScores);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load scores");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadScores();
    }, [loadScores])
  );

  if (loading)
    return <ActivityIndicator style={{ marginTop: 40 }} color={palette.accent} size="large" />;
  if (error)
    return (
      <View style={styles.safe}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );

  if (!data.length) {
    return (
      <View style={styles.safe}>
        <Text style={styles.empty}>No scores saved yet. Play a round!</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={data}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>{index + 1}.</Text>
            <View style={styles.rowContent}>
              <Text style={styles.name}>{item.nickname}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.modeBadge}>{modeLabels[item.mode]}</Text>
                <Text style={styles.meta}>{`${Math.round(item.distancePx)}px · ${item.reactionMs}ms`}</Text>
              </View>
            </View>
            <Text style={styles.score}>{item.score}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: "#04110A",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 5,
  },
  rowContent: { flex: 1, marginLeft: 12 },
  rank: { color: palette.textSecondary, width: 28, textAlign: "right" },
  name: { color: palette.textPrimary, fontWeight: "700", fontSize: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  modeBadge: {
    backgroundColor: palette.surfaceAlt,
    color: palette.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  meta: { color: palette.textSecondary, fontSize: 12, marginLeft: 10 },
  score: { color: palette.accent, fontWeight: "800", fontSize: 18 },
  empty: { color: palette.textSecondary, padding: 16 },
  error: { color: palette.negative, padding: 16 },
});
