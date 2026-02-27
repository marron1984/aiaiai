import { SCORE_WEIGHTS } from "./constants";

export interface ScoreInput {
  trustScore: number;
  usefulnessScore: number;
  importanceScore: number;
  noveltyScore: number;
  urgencyScore: number;
}

/**
 * 合成スコア（読む価値スコア）を算出する
 * 各指標は0-100のスケール、合成スコアも0-100
 */
export function calculateCompositeScore(input: ScoreInput): number {
  const score =
    input.trustScore * SCORE_WEIGHTS.trust +
    input.usefulnessScore * SCORE_WEIGHTS.usefulness +
    input.importanceScore * SCORE_WEIGHTS.importance +
    input.noveltyScore * SCORE_WEIGHTS.novelty +
    input.urgencyScore * SCORE_WEIGHTS.urgency;

  return Math.round(score * 100) / 100;
}

/**
 * スコアからランクを判定
 */
export function getScoreRank(
  compositeScore: number
): "S" | "A" | "B" | "C" | "D" {
  if (compositeScore >= 80) return "S";
  if (compositeScore >= 65) return "A";
  if (compositeScore >= 50) return "B";
  if (compositeScore >= 35) return "C";
  return "D";
}
