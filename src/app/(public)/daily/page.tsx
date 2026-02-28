import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleCard } from "@/components/ArticleCard";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { safeQuery } from "@/lib/safe-query";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "今日のダイジェスト — 午前・午後で追いかける最新情報",
  description: "午前と午後に分けた今日の注目アップデートまとめ",
};

export const dynamic = "force-dynamic";

type ArticleWithTags = {
  id: string;
  slug: string;
  title: string;
  summary3: string;
  compositeScore: number;
  trustScore: number;
  importanceScore: number;
  urgencyScore: number;
  recommendation: string;
  sourceUrl: string;
  publishedAt: Date | null;
  createdAt: Date;
  tags: { tag: { id: string; name: string; slug: string; axis: string } }[];
};

function renderArticle(article: ArticleWithTags) {
  const productTag = article.tags.find((t) => t.tag.axis === "PRODUCT");
  const levelTag = article.tags.find((t) => t.tag.axis === "LEVEL");
  return (
    <ArticleCard
      key={article.id}
      slug={article.slug}
      title={article.title}
      summary3={article.summary3}
      compositeScore={article.compositeScore}
      trustScore={article.trustScore}
      importanceScore={article.importanceScore}
      urgencyScore={article.urgencyScore}
      recommendation={article.recommendation as "TRY" | "MONITOR" | "IGNORE"}
      productTag={productTag?.tag.name}
      levelTag={levelTag?.tag.name}
      publishedAt={article.publishedAt?.toISOString()}
      sourceUrl={article.sourceUrl}
    />
  );
}

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;

  // 日付パラメータ（?date=2026-02-28）またはデフォルト今日
  const now = new Date();
  const targetDate = params.date ? new Date(params.date) : now;
  const dateStr = targetDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  // 今日の開始と終了
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  // 午前/午後の境界
  const noon = new Date(targetDate);
  noon.setHours(12, 0, 0, 0);

  // 全記事取得（今日分、スコア順）
  const { data: allArticles, error } = await safeQuery(
    () =>
      prisma.article.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { publishedAt: { gte: dayStart, lte: dayEnd } },
            {
              publishedAt: null,
              createdAt: { gte: dayStart, lte: dayEnd },
            },
          ],
        },
        orderBy: { compositeScore: "desc" },
        take: 100,
        include: { tags: { include: { tag: true } } },
      }),
    []
  );

  // 午前・午後に分類
  const amArticles = allArticles.filter((a) => {
    const t = a.publishedAt || a.createdAt;
    return t < noon;
  });
  const pmArticles = allArticles.filter((a) => {
    const t = a.publishedAt || a.createdAt;
    return t >= noon;
  });

  // カテゴリ別に分類
  const categoryMap = new Map<string, ArticleWithTags[]>();
  for (const article of allArticles) {
    const productTag = article.tags.find((t) => t.tag.axis === "PRODUCT");
    const catName = productTag?.tag.name || "その他";
    if (!categoryMap.has(catName)) categoryMap.set(catName, []);
    categoryMap.get(catName)!.push(article);
  }

  // 前日・翌日リンク
  const prevDate = new Date(targetDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const prevDateStr = prevDate.toISOString().split("T")[0];
  const nextDateStr = nextDate.toISOString().split("T")[0];
  const isToday =
    targetDate.toDateString() === now.toDateString();
  const isFuture = nextDate > now;

  // 現在が午前か午後か
  const currentHour = now.getHours();
  const isPM = currentHour >= 12;

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-8 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              今日のダイジェスト
            </h1>
            <p className="mt-2 text-sm text-gray-600">{dateStr}</p>
            <p className="mt-1 text-xs text-gray-400">
              午前・午後で追いかける — 全 {allArticles.length} 件
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/daily?date=${prevDateStr}`}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              ← 前日
            </Link>
            {!isFuture && (
              <Link
                href={`/daily?date=${nextDateStr}`}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                翌日 →
              </Link>
            )}
            {!isToday && (
              <Link
                href="/daily"
                className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700"
              >
                今日
              </Link>
            )}
          </div>
        </div>
      </div>

      {error && <DbErrorBanner />}

      {allArticles.length === 0 && !error ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">この日の記事はまだありません。</p>
          <Link
            href={`/daily?date=${prevDateStr}`}
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            前日のダイジェストを見る →
          </Link>
        </div>
      ) : (
        <>
          {/* タイムラインナビ */}
          <div className="mb-6 flex gap-3">
            <a
              href="#am"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                !isPM
                  ? "bg-orange-600 text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              午前 ({amArticles.length})
            </a>
            <a
              href="#pm"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isPM
                  ? "bg-orange-600 text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              午後 ({pmArticles.length})
            </a>
            <a
              href="#category"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              カテゴリ別 ({categoryMap.size})
            </a>
          </div>

          {/* 本日のトップ */}
          {allArticles.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                  TOP
                </span>
                <h2 className="text-lg font-bold text-gray-900">
                  今日の必読 TOP {Math.min(5, allArticles.length)}
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {allArticles.slice(0, 5).map(renderArticle)}
              </div>
            </section>
          )}

          {/* 午前セクション */}
          <section id="am" className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
                AM
              </span>
              <h2 className="text-lg font-bold text-gray-900">
                午前の更新 ({amArticles.length}件)
              </h2>
              <span className="text-xs text-gray-400">0:00 〜 11:59</span>
            </div>
            {amArticles.length === 0 ? (
              <p className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                午前の記事はまだありません
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {amArticles.map(renderArticle)}
              </div>
            )}
          </section>

          {/* 午後セクション */}
          <section id="pm" className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">
                PM
              </span>
              <h2 className="text-lg font-bold text-gray-900">
                午後の更新 ({pmArticles.length}件)
              </h2>
              <span className="text-xs text-gray-400">12:00 〜 23:59</span>
            </div>
            {pmArticles.length === 0 ? (
              <p className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                午後の記事はまだありません
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pmArticles.map(renderArticle)}
              </div>
            )}
          </section>

          {/* カテゴリ別セクション */}
          <section id="category" className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-md bg-gray-700 px-2.5 py-1 text-xs font-bold text-white">
                分類
              </span>
              <h2 className="text-lg font-bold text-gray-900">
                カテゴリ別
              </h2>
            </div>
            {Array.from(categoryMap.entries()).map(([catName, articles]) => (
              <div key={catName} className="mb-6">
                <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {catName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {articles.length}件
                  </span>
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {articles.slice(0, 6).map(renderArticle)}
                </div>
              </div>
            ))}
          </section>

          {/* フッター */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/weekly"
              className="text-sm text-blue-600 hover:underline"
            >
              週次ダイジェスト →
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/latest"
              className="text-sm text-blue-600 hover:underline"
            >
              すべての記事 →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
