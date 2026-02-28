import Link from "next/link";

interface BreakingCardProps {
  slug: string;
  title: string;
  summary3: string;
  productTag?: string;
  recommendation: "TRY" | "MONITOR" | "IGNORE";
  publishedAt?: string;
  sourceUrl: string;
}

export function BreakingCard({
  slug,
  title,
  summary3,
  productTag,
  recommendation,
  publishedAt,
  sourceUrl,
}: BreakingCardProps) {
  const firstLine = summary3.split("\n")[0];
  const recLabel = recommendation === "TRY" ? "試す" : recommendation === "MONITOR" ? "注視" : "様子見";
  const recColor = recommendation === "TRY" ? "text-emerald-600" : recommendation === "MONITOR" ? "text-amber-600" : "text-gray-400";

  return (
    <article className="group flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/50 px-4 py-3 transition-all hover:border-amber-200 hover:bg-amber-50">
      <div className="mt-0.5 shrink-0 text-lg leading-none">⚡</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {productTag && (
            <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 ring-1 ring-gray-200">
              {productTag}
            </span>
          )}
          <span className={`shrink-0 text-[10px] font-bold ${recColor}`}>
            {recLabel}
          </span>
          {publishedAt && (
            <time className="shrink-0 text-[10px] text-gray-400" dateTime={publishedAt}>
              {new Date(publishedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
            </time>
          )}
        </div>
        <Link href={`/article/${slug}`}>
          <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-gray-900 group-hover:text-amber-700">
            {title}
          </h3>
        </Link>
        <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{firstLine}</p>
      </div>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 shrink-0 text-[10px] text-amber-500 hover:underline"
      >
        出典
      </a>
    </article>
  );
}
