import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getScores } from "../src/storage";
import type { ScorePayload } from "../src/types";

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

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (error) return <Text style={{ color: "#EF4444", padding: 16 }}>{error}</Text>;

  if (!data.length) {
    return (
      <View style={styles.safe}>
        <Text style={{ color: "#A3A8C3", padding: 16 }}>No scores saved yet. Play a round!</Text>
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
              <Text style={styles.meta}>
                {`${Math.round(item.distancePx)}px · ${item.reactionMs}ms`}
              </Text>
            </View>
            <Text style={styles.score}>{item.score}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B10" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#141420",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  rowContent: { flex: 1, marginLeft: 12 },
  rank: { color: "#A3A8C3", width: 28, textAlign: "right" },
  name: { color: "#ECEFF4", fontWeight: "700" },
  meta: { color: "#A3A8C3", fontSize: 12, marginTop: 2 },
  score: { color: "#A5B4FC", fontWeight: "700" },
});
