import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { fetchLeaderboard } from "../src/api";

export default function LeaderboardScreen() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchLeaderboard();
        setData(res?.items ?? []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (error) return <Text style={{ color: "#EF4444", padding: 16 }}>{error}</Text>;

  return (
    <View style={styles.safe}>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={data}
        keyExtractor={(item, i) => String(item.id ?? i)}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>{index + 1}.</Text>
            <Text style={styles.name}>{item.nickname}</Text>
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
  rank: { color: "#A3A8C3", width: 28, textAlign: "right" },
  name: { color: "#ECEFF4", flex: 1, marginLeft: 12 },
  score: { color: "#A5B4FC", fontWeight: "700" },
});
