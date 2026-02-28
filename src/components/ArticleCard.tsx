import Link from "next/link";
import { RECOMMENDATION_LABELS } from "@/lib/constants";
import { getScoreRank } from "@/lib/score";

interface ArticleCardProps {
  slug: string;
  title: string;
  summary3: string;
  compositeScore: number;
  trustScore: number;
  importanceScore: number;
  urgencyScore: number;
  recommendation: "TRY" | "MONITOR" | "IGNORE";
  productTag?: string;
  levelTag?: string;
  publishedAt?: string;
  sourceUrl: string;
}

const LEVEL_COLORS: Record<string, string> = {
  "L1: 活用": "bg-green-50 text-green-700 ring-green-200",
  "L2: 定着/自動化": "bg-teal-50 text-teal-700 ring-teal-200",
  "L3: 実装": "bg-purple-50 text-purple-700 ring-purple-200",
};

export function ArticleCard({
  slug,
  title,
  summary3,
  compositeScore,
  trustScore,
  importanceScore,
  urgencyScore,
  recommendation,
  productTag,
  levelTag,
  publishedAt,
  sourceUrl,
}: ArticleCardProps) {
  const rank = getScoreRank(compositeScore);
  const rec = RECOMMENDATION_LABELS[recommendation];
  const scoreBarWidth = Math.min(compositeScore, 100);

  return (
    <article className="group rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-md">
      {/* バッジ行 */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {productTag && (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
            {productTag}
          </span>
        )}
        <span className={`badge ${rec.color}`}>{rec.label}</span>
        {levelTag && (
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${LEVEL_COLORS[levelTag] || "bg-gray-50 text-gray-600 ring-gray-200"}`}>
            {levelTag}
          </span>
        )}
        {urgencyScore >= 70 && (
          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
            緊急
          </span>
        )}
      </div>

      {/* タイトル */}
      <Link href={`/article/${slug}`}>
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 transition-colors group-hover:text-blue-700 md:text-lg">
          {title}
        </h3>
      </Link>

      {/* 要約 */}
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600">
        {summary3}
      </p>

      {/* スコアバー */}
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${
              compositeScore >= 70
                ? "bg-blue-500"
                : compositeScore >= 40
                  ? "bg-amber-400"
                  : "bg-gray-300"
            }`}
            style={{ width: `${scoreBarWidth}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-500">
          {compositeScore} ({rank})
        </span>
      </div>

      {/* フッター情報 */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-3">
          <span>信頼度 {trustScore}</span>
          <span>重要度 {importanceScore}</span>
          {publishedAt && (
            <time dateTime={publishedAt}>
              {new Date(publishedAt).toLocaleDateString("ja-JP")}
            </time>
          )}
        </div>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          出典
        </a>
      </div>
    </article>
  );
}
