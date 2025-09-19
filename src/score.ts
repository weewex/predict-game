export function calculateScore(distancePx: number, reactionMs: number, maxDistance: number): number {
  const baseScore = 1000;
  const clampedDistance = Math.min(distancePx, maxDistance);
  const distancePenalty = (clampedDistance / maxDistance) * 650;
  const timePenalty = Math.max(0, reactionMs - 150) * 0.4;
  return Math.max(0, Math.round(baseScore - distancePenalty - timePenalty));
}
