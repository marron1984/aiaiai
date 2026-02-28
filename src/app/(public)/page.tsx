import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleCard } from "@/components/ArticleCard";
import { BreakingCard } from "@/components/BreakingCard";
import { DeepCard } from "@/components/DeepCard";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";
import { safeQuery } from "@/lib/safe-query";

export const dynamic = "force-dynamic";

// 記事をdepth別に分類するヘルパー
function groupByDepth(articles: ArticleWithTags[]) {
  return {
    breaking: articles.filter((a) => a.depth === "BREAKING").slice(0, 4),
    detailed: articles.filter((a) => a.depth === "DETAILED").slice(0, 4),
    deep: articles.filter((a) => a.depth === "DEEP").slice(0, 2),
  };
}

type ArticleWithTags = Awaited<
  ReturnType<typeof prisma.article.findMany<{ include: { tags: { include: { tag: true } } } }>>
>[number];

// カテゴリに対応する記事を取得
function getArticlesForCategory(
  cat: { slug: string; tagSlug: string },
  allArticles: ArticleWithTags[]
) {
  const aiSlugs = ["chatgpt", "openai-api", "claude", "claude-code", "gemini"];
  const matchSlugs = cat.slug === "ai" ? aiSlugs : [cat.tagSlug];
  return allArticles.filter((a) =>
    a.tags.some((t) => matchSlugs.includes(t.tag.slug))
  );
}

// 深度別記事セクションを描画
function DepthSections({ articles }: { articles: ArticleWithTags[] }) {
  const { breaking, detailed, deep } = groupByDepth(articles);

  return (
    <>
      {breaking.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-sm">⚡</span>
            <h3 className="text-sm font-semibold text-amber-700">速報</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {breaking.map((article) => {
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

      {detailed.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-sm">📋</span>
            <h3 className="text-sm font-semibold text-blue-700">詳しい情報</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {detailed.map((article) => {
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

      {deep.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-sm">🔬</span>
            <h3 className="text-sm font-semibold text-purple-700">深い情報</h3>
          </div>
          <div className="grid gap-3">
            {deep.map((article) => {
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
    </>
  );
}

export default async function HomePage() {
  // カテゴリを取得（有効なもの、子カテゴリ含む）
  const { data: allCategories } = await safeQuery(
    () =>
      prisma.hubCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
    []
  );

  // トップレベルカテゴリのみ（parentId === null）
  const topCategories = allCategories.filter((c) => !c.parentId);

  // 全公開記事を取得（タグ付き）
  const { data: allArticles, error: articlesError } = await safeQuery(
    () =>
      prisma.article.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { compositeScore: "desc" },
        take: 100,
        include: { tags: { include: { tag: true } } },
      }),
    []
  );

  const noArticles = allArticles.length === 0 && !articlesError;

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

        {/* カテゴリタブ（トップレベルのみ） */}
        {topCategories.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {topCategories.map((cat) => (
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

        {/* 日次ダイジェスト・午前/午後ボタン */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/daily"
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600"
          >
            <span>📅</span> 今日のダイジェスト
          </Link>
          <Link
            href="/daily#am"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-amber-900 shadow-sm transition-colors hover:bg-amber-500"
          >
            <span>🌅</span> 午前
          </Link>
          <Link
            href="/daily#pm"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-600"
          >
            <span>🌆</span> 午後
          </Link>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <Link
            href="/latest"
            className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-100"
          >
            すべての記事
          </Link>
          <Link
            href="/weekly"
            className="rounded-lg border border-white/30 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            週次ダイジェスト
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
          {topCategories.map((cat) => {
            const articles = getArticlesForCategory(cat, allArticles);
            const hasChildren = cat.children && cat.children.length > 0;

            if (articles.length === 0 && !hasChildren) return null;

            return (
              <section key={cat.id} id={`cat-${cat.slug}`} className="scroll-mt-20">
                {/* カテゴリヘッダー */}
                <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <h2 className="text-xl font-bold text-gray-900">{cat.name}</h2>
                  {cat.description && (
                    <span className="hidden text-sm text-gray-400 md:inline">
                      — {cat.description}
                    </span>
                  )}
                  <Link
                    href={`/products/${cat.tagSlug}`}
                    className="ml-auto text-sm text-blue-600 hover:underline"
                  >
                    すべて見る →
                  </Link>
                </div>

                {/* メインカテゴリの記事 */}
                {articles.length > 0 && (
                  <DepthSections articles={articles} />
                )}

                {/* サブカテゴリ */}
                {hasChildren && (
                  <div className="mt-6 space-y-6">
                    {cat.children.map((sub) => {
                      const subArticles = getArticlesForCategory(sub, allArticles);
                      if (subArticles.length === 0) return null;

                      return (
                        <div
                          key={sub.id}
                          id={`cat-${sub.slug}`}
                          className="scroll-mt-20 rounded-lg border border-gray-100 bg-gray-50/50 p-4"
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <span className="text-lg">{sub.icon}</span>
                            <h3 className="text-base font-semibold text-gray-800">
                              {sub.name}
                            </h3>
                            {sub.description && (
                              <span className="text-xs text-gray-400">
                                — {sub.description}
                              </span>
                            )}
                          </div>
                          <DepthSections articles={subArticles} />
                        </div>
                      );
                    })}
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
