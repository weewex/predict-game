export function calculateScore(distancePx: number, reactionMs: number, screenWidth: number): number {
  const baseScore = 1000;
  const clampedDistance = Math.min(distancePx, screenWidth);
  const distancePenalty = clampedDistance * 0.5;
  const timePenalty = Math.max(0, reactionMs - 100) * 0.5;
  return Math.max(0, Math.round(baseScore - distancePenalty - timePenalty));
}
