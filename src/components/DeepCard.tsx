import Link from "next/link";
import { RECOMMENDATION_LABELS } from "@/lib/constants";
import { getScoreRank } from "@/lib/score";

interface DeepCardProps {
  slug: string;
  title: string;
  summary3: string;
  summaryLong?: string | null;
  whatChanged?: string | null;
  whoImpacted?: string | null;
  actions?: string | null;
  compositeScore: number;
  trustScore: number;
  recommendation: "TRY" | "MONITOR" | "IGNORE";
  productTag?: string;
  publishedAt?: string;
  sourceUrl: string;
}

export function DeepCard({
  slug,
  title,
  summary3,
  summaryLong,
  whatChanged,
  whoImpacted,
  actions,
  compositeScore,
  trustScore,
  recommendation,
  productTag,
  publishedAt,
  sourceUrl,
}: DeepCardProps) {
  const rank = getScoreRank(compositeScore);
  const rec = RECOMMENDATION_LABELS[recommendation];

  return (
    <article className="group rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/60 via-white to-indigo-50/40 p-5 transition-all hover:border-purple-200 hover:shadow-lg">
      {/* ヘッダー */}
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
          🔬 深掘り
        </span>
        {productTag && (
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
            {productTag}
          </span>
        )}
        <span className={`badge ${rec.color}`}>{rec.label}</span>
        <span className="ml-auto text-xs font-bold text-purple-600">
          {compositeScore} ({rank})
        </span>
      </div>

      {/* タイトル */}
      <Link href={`/article/${slug}`}>
        <h3 className="text-lg font-bold leading-snug text-gray-900 group-hover:text-purple-700 md:text-xl">
          {title}
        </h3>
      </Link>

      {/* 要約 */}
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        {summaryLong || summary3}
      </p>

      {/* 構造化情報 */}
      {(whatChanged || whoImpacted || actions) && (
        <div className="mt-4 grid gap-2 rounded-lg bg-white/80 p-3 text-sm md:grid-cols-3">
          {whatChanged && (
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-purple-500">何が変わった</div>
              <p className="text-gray-700">{whatChanged}</p>
            </div>
          )}
          {whoImpacted && (
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-purple-500">誰に影響</div>
              <p className="text-gray-700">{whoImpacted}</p>
            </div>
          )}
          {actions && (
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-purple-500">今すぐやること</div>
              <p className="text-gray-700">{actions}</p>
            </div>
          )}
        </div>
      )}

      {/* フッター */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
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
          className="text-purple-500 hover:underline"
        >
          出典を確認 →
        </a>
      </div>
    </article>
  );
}
