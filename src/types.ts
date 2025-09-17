export type GameMode = "SIMPLE";
export interface ScorePayload {
  nickname: string;
  mode: GameMode;
  distancePx: number;
  reactionMs: number;
  screenWidth: number;
  targetX: number;
  guessX: number;
  timestamp: string;
  score: number;
}
