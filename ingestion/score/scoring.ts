import { SCORE_WEIGHTS, SOURCE_HIERARCHY } from "../../src/lib/constants";

export interface ScoringInput {
  sourceType: keyof typeof SOURCE_HIERARCHY;
  title: string;
  content?: string;
  isBreakingChange?: boolean;
  isJapaneseRelated?: boolean;
  isPricingChange?: boolean;
  isSecurityRelated?: boolean;
}

export interface ScoringOutput {
  trustScore: number;
  importanceScore: number;
  noveltyScore: number;
  usefulnessScore: number;
  urgencyScore: number;
  compositeScore: number;
  recommendation: "TRY" | "MONITOR" | "IGNORE";
}

/**
 * 記事のスコアリングを算出する
 */
export function scoreArticle(input: ScoringInput): ScoringOutput {
  // 信頼性スコア: ソースヒエラルキーから算出
  const hierarchyValue = SOURCE_HIERARCHY[input.sourceType] ?? 1;
  const trustScore = Math.min(100, hierarchyValue * 25);

  // 重要度スコア: キーワードベースで判定
  let importanceScore = 50;
  const combinedText = `${input.title} ${input.content || ""}`.toLowerCase();

  if (input.isPricingChange || combinedText.includes("pricing") || combinedText.includes("料金")) {
    importanceScore += 20;
  }
  if (input.isSecurityRelated || combinedText.includes("security") || combinedText.includes("セキュリティ")) {
    importanceScore += 15;
  }
  if (combinedText.includes("breaking") || combinedText.includes("deprecated") || combinedText.includes("廃止")) {
    importanceScore += 20;
  }
  if (combinedText.includes("api") || combinedText.includes("sdk")) {
    importanceScore += 10;
  }
  importanceScore = Math.min(100, importanceScore);

  // 新規性スコア
  let noveltyScore = 50;
  if (input.isBreakingChange) noveltyScore += 30;
  if (combinedText.includes("new") || combinedText.includes("新機能") || combinedText.includes("リリース")) {
    noveltyScore += 15;
  }
  noveltyScore = Math.min(100, noveltyScore);

  // 有用性スコア
  let usefulnessScore = 50;
  if (combinedText.includes("how to") || combinedText.includes("使い方") || combinedText.includes("手順")) {
    usefulnessScore += 20;
  }
  if (input.isJapaneseRelated) usefulnessScore += 15;
  usefulnessScore = Math.min(100, usefulnessScore);

  // 緊急度スコア
  let urgencyScore = 30;
  if (input.isBreakingChange) urgencyScore += 40;
  if (input.isSecurityRelated) urgencyScore += 30;
  if (combinedText.includes("immediately") || combinedText.includes("即時") || combinedText.includes("urgent")) {
    urgencyScore += 20;
  }
  urgencyScore = Math.min(100, urgencyScore);

  // 合成スコア
  const compositeScore =
    Math.round(
      (trustScore * SCORE_WEIGHTS.trust +
        usefulnessScore * SCORE_WEIGHTS.usefulness +
        importanceScore * SCORE_WEIGHTS.importance +
        noveltyScore * SCORE_WEIGHTS.novelty +
        urgencyScore * SCORE_WEIGHTS.urgency) *
        100
    ) / 100;

  // 推奨アクション
  let recommendation: "TRY" | "MONITOR" | "IGNORE";
  if (compositeScore >= 70) {
    recommendation = "TRY";
  } else if (compositeScore >= 45) {
    recommendation = "MONITOR";
  } else {
    recommendation = "IGNORE";
  }

  return {
    trustScore,
    importanceScore,
    noveltyScore,
    usefulnessScore,
    urgencyScore,
    compositeScore,
    recommendation,
  };
}
