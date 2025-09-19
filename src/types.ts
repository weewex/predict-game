export type GameMode = "SIMPLE" | "NORMAL" | "PRO";
export interface ScorePayload {
  nickname: string;
  mode: GameMode;
  distancePx: number;
  reactionMs: number;
  screenWidth: number;
  screenHeight: number;
  targetX: number;
  targetY: number;
  guessX: number;
  guessY: number;
  timestamp: string;
  score: number;
}
