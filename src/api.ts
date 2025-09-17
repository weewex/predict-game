import type { ScorePayload } from "./types";
const API_BASE = "https://example.com/api"; // change to your backend
export async function postScore(payload: ScorePayload) {
  const res = await fetch(`${API_BASE}/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to submit score: ${res.status}`);
  return res.json();
}
export async function fetchLeaderboard() {
  const res = await fetch(`${API_BASE}/leaderboard`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}
