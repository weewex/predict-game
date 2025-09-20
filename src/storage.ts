import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PlayerProfile, ScorePayload } from "./types";

const KEY_NICKNAME = "nickname"; // legacy compatibility key
const KEY_PLAYERS = "players";
const KEY_ACTIVE_PLAYER = "activePlayer";
const KEY_SCORES = "scores";

function sanitizeName(name: string) {
  return name.trim();
}

function createPlayerProfile(name: string): PlayerProfile {
  return {
    id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: new Date().toISOString(),
  };
}

function isPlayerProfile(value: any): value is PlayerProfile {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.createdAt === "string"
  );
}

async function readPlayers(): Promise<PlayerProfile[]> {
  const raw = await AsyncStorage.getItem(KEY_PLAYERS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPlayerProfile);
  } catch (error) {
    console.warn("Failed to parse stored players", error);
    return [];
  }
}

async function writePlayers(players: PlayerProfile[]) {
  await AsyncStorage.setItem(KEY_PLAYERS, JSON.stringify(players));
}

export async function getPlayers(): Promise<PlayerProfile[]> {
  const existing = await readPlayers();
  if (existing.length > 0) {
    return existing;
  }

  const legacyName = sanitizeName((await AsyncStorage.getItem(KEY_NICKNAME)) ?? "");
  if (!legacyName) {
    return [];
  }

  const legacyPlayer = createPlayerProfile(legacyName);
  await writePlayers([legacyPlayer]);
  await AsyncStorage.setItem(KEY_ACTIVE_PLAYER, legacyPlayer.id);
  return [legacyPlayer];
}

export async function addPlayer(name: string): Promise<PlayerProfile> {
  const trimmed = sanitizeName(name);
  if (trimmed.length < 3) {
    throw new Error("Name must be at least 3 characters long.");
  }

  const players = await getPlayers();
  const existing = players.find((player) => player.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    await setActivePlayer(existing.id);
    return existing;
  }

  const next = createPlayerProfile(trimmed);
  const updated = [...players, next];
  await writePlayers(updated);
  await setActivePlayer(next.id);
  return next;
}

export async function setActivePlayer(playerId: string) {
  const players = await getPlayers();
  const target = players.find((player) => player.id === playerId);
  if (!target) {
    throw new Error("Player not found");
  }
  await AsyncStorage.setItem(KEY_ACTIVE_PLAYER, target.id);
  await AsyncStorage.setItem(KEY_NICKNAME, target.name);
}

export async function getActivePlayer(): Promise<PlayerProfile | null> {
  const players = await getPlayers();
  if (players.length === 0) {
    return null;
  }
  const activeId = await AsyncStorage.getItem(KEY_ACTIVE_PLAYER);
  const active = players.find((player) => player.id === activeId);
  if (active) {
    return active;
  }
  const fallback = players[0];
  await AsyncStorage.setItem(KEY_ACTIVE_PLAYER, fallback.id);
  await AsyncStorage.setItem(KEY_NICKNAME, fallback.name);
  return fallback;
}

export async function saveNickname(name: string) {
  await addPlayer(name);
}

export async function getNickname(): Promise<string | null> {
  const active = await getActivePlayer();
  return active?.name ?? null;
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
  const sanitized: ScorePayload = {
    ...entry,
    nickname: sanitizeName(entry.nickname),
    playerId: entry.playerId ?? null,
  };
  const updated = [...existing, sanitized].sort((a, b) => b.score - a.score);
  await AsyncStorage.setItem(KEY_SCORES, JSON.stringify(updated));
}
