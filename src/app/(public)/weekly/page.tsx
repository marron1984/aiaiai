import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleCard } from "@/components/ArticleCard";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { safeQuery } from "@/lib/safe-query";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "週次ダイジェスト — 今週これだけ読めばOK",
  description: "忙しいあなたのための今週の注目AIアップデートまとめ",
};

export const dynamic = "force-dynamic";

export default async function WeeklyPage() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // 全記事（スコア順）
  const { data: allArticles, error } = await safeQuery(
    () =>
      prisma.article.findMany({
        where: {
          status: "PUBLISHED",
          publishedAt: { gte: oneWeekAgo },
        },
        orderBy: { compositeScore: "desc" },
        take: 30,
        include: { tags: { include: { tag: true } } },
      }),
    []
  );

  const today = new Date().toLocaleDateString("ja-JP");
  const weekAgo = oneWeekAgo.toLocaleDateString("ja-JP");

  // 「これだけ読めばOK」: 上位5件
  const mustRead = allArticles.slice(0, 5);

  // レベル別に分類
  const forBizUsers = allArticles.filter((a) =>
    a.tags.some(
      (t) => t.tag.slug === "l1-usage" || t.tag.slug === "l2-automation"
    )
  );
  const forDevs = allArticles.filter((a) =>
    a.tags.some((t) => t.tag.slug === "l3-implementation")
  );
  const communityPicks = allArticles.filter(
    (a) => a.trustScore <= 60 && a.usefulnessScore >= 60
  );

  function renderArticle(article: (typeof allArticles)[0]) {
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
        recommendation={article.recommendation}
        productTag={productTag?.tag.name}
        levelTag={levelTag?.tag.name}
        publishedAt={article.publishedAt?.toISOString()}
        sourceUrl={article.sourceUrl}
      />
    );
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-8 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">
          今週これだけ読めばOK
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {weekAgo} 〜 {today} — 忙しいあなたのために、読む価値順で厳選
        </p>
        <p className="mt-1 text-xs text-gray-400">
          開発も通常業務も忙しい人が、最短でAIのキャッチアップできるダイジェスト
        </p>
      </div>

      {error && <DbErrorBanner />}

      {allArticles.length === 0 && !error ? (
        <p className="text-gray-500">今週の記事はまだありません。</p>
      ) : (
        <>
          {/* 必読 TOP 5 */}
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
                必読
              </span>
              <h2 className="text-lg font-bold text-gray-900">
                今週の TOP {mustRead.length}
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {mustRead.map(renderArticle)}
            </div>
          </section>

          {/* 活用・業務向け（吉田レベル） */}
          {forBizUsers.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-md bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                  活用・業務向け
                </span>
                <h2 className="text-lg font-bold text-gray-900">
                  すぐ使える・業務に効く
                </h2>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                プロンプト活用、ワークフロー改善、導入事例など実務者向け
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {forBizUsers.slice(0, 6).map(renderArticle)}
              </div>
            </section>
          )}

          {/* 開発者向け */}
          {forDevs.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-md bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
                  開発者向け
                </span>
                <h2 className="text-lg font-bold text-gray-900">
                  API・SDK・技術変更
                </h2>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                余裕があるときに目を通す — 実装や互換性に影響するアップデート
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {forDevs.slice(0, 6).map(renderArticle)}
              </div>
            </section>
          )}

          {/* コミュニティの良記事 */}
          {communityPicks.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                  みんなの記事
                </span>
                <h2 className="text-lg font-bold text-gray-900">
                  Zenn・Qiita・note から厳選
                </h2>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                一般の方が書いた実践的な記事 — 使ってみた・入門・まとめ系
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {communityPicks.slice(0, 6).map(renderArticle)}
              </div>
            </section>
          )}

          {/* フッターリンク */}
          <div className="mt-8 text-center">
            <Link
              href="/latest"
              className="text-sm text-blue-600 hover:underline"
            >
              今週のすべての記事を見る ({allArticles.length}件) →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
