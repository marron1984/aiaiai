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
  publishedAt?: string;
  sourceUrl: string;
}

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
  publishedAt,
  sourceUrl,
}: ArticleCardProps) {
  const rank = getScoreRank(compositeScore);
  const rec = RECOMMENDATION_LABELS[recommendation];

  return (
    <article className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {productTag && (
          <span className="badge badge-trust">{productTag}</span>
        )}
        <span className={`badge ${rec.color}`}>{rec.label}</span>
        <span className="badge badge-importance">
          重要度 {importanceScore}
        </span>
        {urgencyScore >= 70 && (
          <span className="badge badge-urgency">緊急</span>
        )}
        <span className="ml-auto text-xs text-gray-400">
          スコア {compositeScore} ({rank})
        </span>
      </div>

      <Link href={`/article/${slug}`}>
        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-700">
          {title}
        </h3>
      </Link>

      <p className="mt-2 text-sm leading-relaxed text-gray-600">{summary3}</p>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-3">
          <span>信頼度 {trustScore}</span>
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
