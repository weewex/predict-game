import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getActivePlayer, getScores } from "../src/storage";
import type { GameMode, PlayerProfile, ScorePayload } from "../src/types";
import { palette } from "../src/theme";

const modeLabels: Record<GameMode, string> = {
  SIMPLE: "Simple",
  NORMAL: "Normal",
  PRO: "Pro",
};

const modes: GameMode[] = ["SIMPLE", "NORMAL", "PRO"];

const sortOptions = [
  { key: "score", label: "Score" },
  { key: "time", label: "Time" },
  { key: "distance", label: "Distance" },
] as const;

type SortKey = (typeof sortOptions)[number]["key"];

interface MetricChartConfig {
  key: string;
  label: string;
  color: string;
  unit: string;
  accessor: (entry: ScorePayload) => number;
  isLowerBetter?: boolean;
}

const metricConfigs: MetricChartConfig[] = [
  {
    key: "score",
    label: "Score trend",
    color: palette.accent,
    unit: "",
    accessor: (entry) => entry.score,
  },
  {
    key: "time",
    label: "Reaction time",
    color: palette.negative,
    unit: "ms",
    accessor: (entry) => entry.reactionMs,
    isLowerBetter: true,
  },
  {
    key: "distance",
    label: "Distance offset",
    color: palette.positive,
    unit: "px",
    accessor: (entry) => entry.distancePx,
    isLowerBetter: true,
  },
];

const comparators: Record<SortKey, (a: ScorePayload, b: ScorePayload) => number> = {
  score: (a, b) => b.score - a.score,
  time: (a, b) => a.reactionMs - b.reactionMs,
  distance: (a, b) => a.distancePx - b.distancePx,
};

function formatTimestamp(value: string) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return value;
  }
}

function formatChartTimestamp(value: string) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}

function formatValue(value: number, unit: string) {
  const rounded = Math.round(value);
  return `${rounded}${unit ? ` ${unit}` : ""}`;
}

function formatSortValue(entry: ScorePayload, key: SortKey) {
  switch (key) {
    case "time":
      return `${entry.reactionMs} ms`;
    case "distance":
      return `${Math.round(entry.distancePx)} px`;
    default:
      return `${entry.score}`;
  }
}

interface MetricChartProps extends MetricChartConfig {
  data: ScorePayload[];
}

function MetricChart({ data, label, unit, color, accessor, isLowerBetter }: MetricChartProps) {
  const points = useMemo(() => {
    const sorted = [...data].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    return sorted.slice(-12);
  }, [data]);

  const samples = useMemo(
    () =>
      points
        .map((item) => ({ item, value: accessor(item) }))
        .filter(({ value }) => Number.isFinite(value)),
    [points, accessor]
  );

  if (!samples.length) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>{label}</Text>
        <Text style={styles.chartEmpty}>Play a few rounds to populate this chart.</Text>
      </View>
    );
  }

  const values = samples.map((sample) => sample.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const normalizedHeights = values.map((value) => {
    const normalized = (value - minValue) / range;
    const ratio = isLowerBetter ? 1 - normalized : normalized;
    const clamped = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
    return clamped <= 0 ? 0.15 : clamped;
  });

  const bestValue = isLowerBetter ? Math.min(...values) : Math.max(...values);
  const latestValue = values[values.length - 1];
  const firstTimestamp = samples[0]?.item.timestamp;
  const lastTimestamp = samples[samples.length - 1]?.item.timestamp;

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{label}</Text>
        <Text style={styles.chartMeta}>Best {formatValue(bestValue, unit)}</Text>
      </View>
      <View style={styles.chartBars}>
        {normalizedHeights.map((ratio, index) => {
          const sample = samples[index];
          const barHeight = 18 + ratio * 92;
          const isLast = index === normalizedHeights.length - 1;
          return (
            <View key={`${sample.item.timestamp}-${index}`} style={styles.chartBarTrack}>
              <View
                style={[
                  styles.chartBarFill,
                  {
                    height: barHeight,
                    backgroundColor: color,
                    opacity: isLast ? 1 : 0.65,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.chartFooter}>
        <Text style={styles.chartFooterText}>{firstTimestamp ? formatChartTimestamp(firstTimestamp) : ""}</Text>
        <Text style={styles.chartFooterText}>{lastTimestamp ? formatChartTimestamp(lastTimestamp) : ""}</Text>
      </View>
      <Text style={styles.chartCurrent}>Last {formatValue(latestValue, unit)}</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const [data, setData] = useState<ScorePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<GameMode>("SIMPLE");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [activePlayer, setActivePlayer] = useState<PlayerProfile | null>(null);

  const loadScores = useCallback(async () => {
    setLoading(true);
    try {
      const [savedScores, profile] = await Promise.all([getScores(), getActivePlayer()]);
      setData(savedScores);
      setActivePlayer(profile);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load scores");
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

  useEffect(() => {
    if (!data.length) return;
    if (!data.some((entry) => entry.mode === activeMode)) {
      setActiveMode(data[0].mode);
    }
  }, [data, activeMode]);

  const modeCounts = useMemo(() => {
    return data.reduce(
      (acc, entry) => {
        acc[entry.mode] = (acc[entry.mode] ?? 0) + 1;
        return acc;
      },
      { SIMPLE: 0, NORMAL: 0, PRO: 0 } as Record<GameMode, number>
    );
  }, [data]);

  const modeData = useMemo(() => data.filter((entry) => entry.mode === activeMode), [data, activeMode]);

  const sortedModeData = useMemo(() => {
    const copy = [...modeData];
    copy.sort(comparators[sortKey]);
    return copy;
  }, [modeData, sortKey]);

  const renderItem = useCallback(
    ({ item, index }: { item: ScorePayload; index: number }) => {
      const isActive = !!item.playerId && !!activePlayer && item.playerId === activePlayer.id;
      return (
        <View style={[styles.row, isActive && styles.rowActive]}>
          <View style={styles.rankCircle}>
            <Text style={styles.rankText}>{index + 1}</Text>
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.name}>{item.nickname}</Text>
            <Text style={styles.meta}>{`${Math.round(item.distancePx)}px · ${item.reactionMs}ms`}</Text>
            <Text style={styles.metaSecondary}>{formatTimestamp(item.timestamp)}</Text>
          </View>
          <View style={styles.valueContainer}>
            <Text style={styles.valueLabel}>{sortKey === "score" ? "Score" : sortKey === "time" ? "Time" : "Distance"}</Text>
            <Text style={[styles.value, sortKey !== "score" && styles.valueAlt]}>{formatSortValue(item, sortKey)}</Text>
          </View>
        </View>
      );
    },
    [activePlayer, sortKey]
  );

  const keyExtractor = useCallback((item: ScorePayload, index: number) => `${item.timestamp}-${index}`, []);

  const headerComponent = useMemo(
    () => (
      <View>
        <View style={styles.modeTabs}>
          {modes.map((mode) => {
            const isActive = activeMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.modeTab, isActive && styles.modeTabActive]}
                onPress={() => setActiveMode(mode)}
                activeOpacity={0.85}
              >
                <Text style={[styles.modeTabLabel, isActive && styles.modeTabLabelActive]}>{modeLabels[mode]}</Text>
                <Text style={[styles.modeTabCount, isActive && styles.modeTabLabelActive]}>{modeCounts[mode] ?? 0}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.sortRow}>
          {sortOptions.map((option) => {
            const isActive = sortKey === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.sortChip, isActive && styles.sortChipActive]}
                onPress={() => setSortKey(option.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.chartsWrapper}>
          {metricConfigs.map((config) => (
            <MetricChart key={config.key} data={modeData} {...config} />
          ))}
        </View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          {activePlayer && <Text style={styles.sectionSubtitle}>Active profile: {activePlayer.name}</Text>}
        </View>
      </View>
    ),
    [activeMode, sortKey, modeData, modeCounts, activePlayer]
  );

  const emptyComponent = useMemo(
    () => <Text style={styles.empty}>No attempts recorded for {modeLabels[activeMode]} yet.</Text>,
    [activeMode]
  );

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={palette.accent} size="large" />;
  }

  if (error) {
    return (
      <View style={styles.safe}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <FlatList
        data={sortedModeData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={emptyComponent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  listContent: { padding: 16, paddingBottom: 32 },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: palette.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden",
    marginBottom: 16,
  },
  modeTab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  modeTabActive: { backgroundColor: palette.surface, borderRightWidth: 0 },
  modeTabLabel: { color: palette.textSecondary, fontSize: 13, fontWeight: "600" },
  modeTabLabelActive: { color: palette.textPrimary },
  modeTabCount: { color: palette.textSecondary, fontSize: 12, marginTop: 4 },
  sortRow: { flexDirection: "row", marginBottom: 16 },
  sortChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    marginRight: 10,
    backgroundColor: palette.surfaceAlt,
  },
  sortChipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  sortChipText: {
    color: palette.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sortChipTextActive: { color: palette.textPrimary },
  chartsWrapper: { marginBottom: 24 },
  chartCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    marginBottom: 16,
  },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chartTitle: { color: palette.textPrimary, fontSize: 16, fontWeight: "700" },
  chartMeta: { color: palette.textSecondary, fontSize: 12 },
  chartBars: { flexDirection: "row", alignItems: "flex-end", height: 120, marginTop: 12 },
  chartBarTrack: {
    flex: 1,
    maxWidth: 40,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    borderRadius: 12,
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 4,
  },
  chartBarFill: { width: "100%", borderRadius: 8 },
  chartFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  chartFooterText: { color: palette.textSecondary, fontSize: 11 },
  chartCurrent: { color: palette.textSecondary, fontSize: 12, textAlign: "right", marginTop: 6 },
  chartEmpty: { color: palette.textSecondary, fontSize: 12, marginTop: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: palette.textPrimary, fontSize: 18, fontWeight: "700" },
  sectionSubtitle: { color: palette.textSecondary, fontSize: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    marginBottom: 12,
  },
  rowActive: {
    borderColor: palette.accent,
    shadowColor: palette.accent,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.border,
    marginRight: 12,
  },
  rankText: { color: palette.textSecondary, fontWeight: "700" },
  rowContent: { flex: 1 },
  name: { color: palette.textPrimary, fontWeight: "700", fontSize: 16 },
  meta: { color: palette.textSecondary, fontSize: 12, marginTop: 4 },
  metaSecondary: { color: palette.textSecondary, fontSize: 11, marginTop: 2 },
  valueContainer: { alignItems: "flex-end" },
  valueLabel: { color: palette.textSecondary, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  value: { color: palette.accent, fontWeight: "800", fontSize: 18, marginTop: 4 },
  valueAlt: { color: palette.textPrimary },
  empty: { color: palette.textSecondary, textAlign: "center", marginTop: 24 },
  error: { color: palette.negative, padding: 16 },
});
