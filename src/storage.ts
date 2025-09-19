import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ScorePayload } from "./types";

const KEY_NICKNAME = "nickname";
const KEY_SCORES = "scores";

export async function saveNickname(name: string) {
  await AsyncStorage.setItem(KEY_NICKNAME, name.trim());
}

export async function getNickname(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_NICKNAME);
}

export async function getScores(): Promise<ScorePayload[]> {
  const raw = await AsyncStorage.getItem(KEY_SCORES);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ScorePayload[];
  } catch (error) {
    console.warn("Failed to parse stored scores", error);
    return [];
  }
}

export async function saveScoreEntry(entry: ScorePayload) {
  const existing = await getScores();
  const updated = [...existing, entry].sort((a, b) => b.score - a.score);
  await AsyncStorage.setItem(KEY_SCORES, JSON.stringify(updated));
}
