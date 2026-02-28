import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleCard } from "@/components/ArticleCard";
import { BreakingCard } from "@/components/BreakingCard";
import { DeepCard } from "@/components/DeepCard";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";
import { safeQuery } from "@/lib/safe-query";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // カテゴリを取得（有効なものを表示順で）
  const { data: categories } = await safeQuery(
    () =>
      prisma.hubCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
    []
  );

  // 全公開記事を取得（タグ付き）
  const { data: allArticles, error: articlesError } = await safeQuery(
    () =>
      prisma.article.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { compositeScore: "desc" },
        take: 50,
        include: { tags: { include: { tag: true } } },
      }),
    []
  );

  const noArticles = allArticles.length === 0 && !articlesError;

  // カテゴリごとに記事をグルーピング
  const categoryArticles = categories.map((cat) => {
    // "ai" カテゴリは複数のAI系タグをまとめる
    const aiSlugs = ["chatgpt", "openai-api", "claude", "claude-code", "gemini"];
    const matchSlugs = cat.slug === "ai" ? aiSlugs : [cat.tagSlug];

    const articles = allArticles.filter((a) =>
      a.tags.some((t) => matchSlugs.includes(t.tag.slug))
    );

    return {
      ...cat,
      articles,
      breaking: articles.filter((a) => a.depth === "BREAKING").slice(0, 4),
      detailed: articles.filter((a) => a.depth === "DETAILED").slice(0, 4),
      deep: articles.filter((a) => a.depth === "DEEP").slice(0, 2),
    };
  });

  return (
    <div>
      {/* ヒーロー */}
      <section className="mb-8 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-6 py-8 text-center text-white md:py-12">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          {SITE_NAME}
        </h1>
        <p className="mt-2 text-base font-medium text-blue-200 md:text-lg">
          {SITE_DESCRIPTION}
        </p>

        {/* カテゴリタブ */}
        {categories.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.slug}`}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur transition-colors hover:border-white/40 hover:bg-white/20"
              >
                {cat.icon} {cat.name}
              </a>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            href="/latest"
            className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-100"
          >
            すべての記事
          </Link>
          <Link
            href="/search"
            className="rounded-lg border border-white/30 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            検索
          </Link>
        </div>
      </section>

      {articlesError && <DbErrorBanner />}

      {noArticles ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">
            まだ記事がありません。管理画面からソースを追加して収集を開始してください。
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            管理画面へ
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {categoryArticles.map((cat) => {
            if (cat.articles.length === 0) return null;
            return (
              <section key={cat.id} id={`cat-${cat.slug}`} className="scroll-mt-20">
                {/* カテゴリヘッダー */}
                <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <h2 className="text-xl font-bold text-gray-900">{cat.name}</h2>
                  {cat.description && (
                    <span className="text-sm text-gray-400">— {cat.description}</span>
                  )}
                  <Link
                    href={`/products/${cat.tagSlug}`}
                    className="ml-auto text-sm text-blue-600 hover:underline"
                  >
                    すべて見る →
                  </Link>
                </div>

                {/* 速報 */}
                {cat.breaking.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="text-sm">⚡</span>
                      <h3 className="text-sm font-semibold text-amber-700">速報</h3>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {cat.breaking.map((article) => {
                        const pTag = article.tags.find((t) => t.tag.axis === "PRODUCT");
                        return (
                          <BreakingCard
                            key={article.id}
                            slug={article.slug}
                            title={article.title}
                            summary3={article.summary3}
                            productTag={pTag?.tag.name}
                            recommendation={article.recommendation}
                            publishedAt={article.publishedAt?.toISOString()}
                            sourceUrl={article.sourceUrl}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 詳細 */}
                {cat.detailed.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="text-sm">📋</span>
                      <h3 className="text-sm font-semibold text-blue-700">詳しい情報</h3>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {cat.detailed.map((article) => {
                        const pTag = article.tags.find((t) => t.tag.axis === "PRODUCT");
                        const lTag = article.tags.find((t) => t.tag.axis === "LEVEL");
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
                            productTag={pTag?.tag.name}
                            levelTag={lTag?.tag.name}
                            publishedAt={article.publishedAt?.toISOString()}
                            sourceUrl={article.sourceUrl}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 深掘り */}
                {cat.deep.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="text-sm">🔬</span>
                      <h3 className="text-sm font-semibold text-purple-700">深い情報</h3>
                    </div>
                    <div className="grid gap-3">
                      {cat.deep.map((article) => {
                        const pTag = article.tags.find((t) => t.tag.axis === "PRODUCT");
                        return (
                          <DeepCard
                            key={article.id}
                            slug={article.slug}
                            title={article.title}
                            summary3={article.summary3}
                            summaryLong={article.summaryLong}
                            whatChanged={article.whatChanged}
                            whoImpacted={article.whoImpacted}
                            actions={article.actions}
                            compositeScore={article.compositeScore}
                            trustScore={article.trustScore}
                            recommendation={article.recommendation}
                            productTag={pTag?.tag.name}
                            publishedAt={article.publishedAt?.toISOString()}
                            sourceUrl={article.sourceUrl}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
