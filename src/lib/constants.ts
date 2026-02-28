export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "aiaiai";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const SITE_DESCRIPTION =
  "日々進化するAI情報を一手に集約する高品質日本語情報サイト";

// スコアリング重み
// 吉田ペルソナ: 忙しい実務者 → 有用性を最重視、次に重要度
export const SCORE_WEIGHTS = {
  usefulness: 0.30,
  importance: 0.25,
  trust: 0.20,
  novelty: 0.15,
  urgency: 0.10,
} as const;

// ソース信頼ヒエラルキー
export const SOURCE_HIERARCHY = {
  OFFICIAL: 4,
  RSS: 3,
  GITHUB: 3,
  X: 1,
} as const;

// 推奨アクションラベル
export const RECOMMENDATION_LABELS = {
  TRY: { label: "今すぐ試す", color: "badge-try" },
  MONITOR: { label: "注視", color: "badge-monitor" },
  IGNORE: { label: "様子見", color: "badge-ignore" },
} as const;

// タグ軸
export const TAG_AXES = {
  PRODUCT: "プロダクト",
  THEME: "テーマ",
  LEVEL: "レベル",
  USECASE: "実務用途",
} as const;

// 記事深度ラベル
export const DEPTH_LABELS = {
  BREAKING: { label: "速報", icon: "⚡", color: "bg-amber-50 text-amber-700 ring-amber-200", description: "今起きていること" },
  DETAILED: { label: "詳細", icon: "📋", color: "bg-blue-50 text-blue-700 ring-blue-200", description: "何が変わったか" },
  DEEP: { label: "深掘り", icon: "🔬", color: "bg-purple-50 text-purple-700 ring-purple-200", description: "なぜ重要か" },
} as const;

// レベル定義
export const LEVELS = {
  L1: "活用（使い方/運用/社内展開）",
  L2: "定着/自動化（ワークフロー/連携/運用設計）",
  L3: "実装（API/SDK/互換性/セキュリティ/移行）",
} as const;
