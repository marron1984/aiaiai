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
  // 速報（BREAKING）
  const { data: breakingArticles } = await safeQuery(
    () =>
      prisma.article.findMany({
        where: { status: "PUBLISHED", depth: "BREAKING" },
        orderBy: { publishedAt: "desc" },
        take: 6,
        include: { tags: { include: { tag: true } } },
      }),
    []
  );

  // 詳細（DETAILED）
  const { data: detailedArticles, error: articlesError } = await safeQuery(
    () =>
      prisma.article.findMany({
        where: { status: "PUBLISHED", depth: "DETAILED" },
        orderBy: { compositeScore: "desc" },
        take: 8,
        include: { tags: { include: { tag: true } } },
      }),
    []
  );

  // 深掘り（DEEP）
  const { data: deepArticles } = await safeQuery(
    () =>
      prisma.article.findMany({
        where: { status: "PUBLISHED", depth: "DEEP" },
        orderBy: { compositeScore: "desc" },
        take: 3,
        include: { tags: { include: { tag: true } } },
      }),
    []
  );

  // 全記事（depthなしのフォールバック: まだdepthが設定されていない記事も表示）
  const { data: allArticles } = await safeQuery(
    () =>
      prisma.article.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { compositeScore: "desc" },
        take: 20,
        include: { tags: { include: { tag: true } } },
      }),
    []
  );

  const { data: productTags } = await safeQuery(
    () =>
      prisma.tag.findMany({
        where: { axis: "PRODUCT" },
        orderBy: { sortOrder: "asc" },
      }),
    []
  );

  // depth未設定の記事をフォールバックとして各セクションに割り振る
  const hasDepthData = breakingArticles.length > 0 || detailedArticles.length > 0 || deepArticles.length > 0;
  const fallbackBreaking = hasDepthData ? breakingArticles : allArticles.filter((_, i) => i < 4);
  const fallbackDetailed = hasDepthData ? detailedArticles : allArticles.filter((_, i) => i >= 4 && i < 12);
  const fallbackDeep = hasDepthData ? deepArticles : allArticles.filter((_, i) => i >= 12 && i < 15);

  const noArticles = allArticles.length === 0 && !articlesError;

  return (
    <div>
      {/* ヒーローセクション */}
      <section className="mb-10 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-6 py-10 text-center text-white md:py-14">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
          {SITE_NAME}
        </h1>
        <p className="mt-3 text-lg font-medium text-blue-200 md:text-xl">
          {SITE_DESCRIPTION}
        </p>
        <p className="mt-2 text-sm text-blue-300/80">
          公式一次情報を収集 → 重複統合 → 実務者向け要約で「読む価値順」に提示
        </p>

        {/* プロダクト別ナビ */}
        {productTags.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {productTags.map((tag) => (
              <Link
                key={tag.id}
                href={`/products/${tag.slug}`}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur transition-colors hover:border-white/40 hover:bg-white/20"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/latest"
            className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-100"
          >
            すべての記事を見る
          </Link>
          <Link
            href="/search"
            className="rounded-lg border border-white/30 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            検索する
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
        <>
          {/* ━━━ セクション1: 速報 ━━━ */}
          {fallbackBreaking.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h2 className="text-lg font-bold text-gray-900">速報</h2>
                <span className="text-sm text-gray-400">— 今起きていること</span>
                <Link
                  href="/latest?depth=breaking"
                  className="ml-auto text-sm text-amber-600 hover:underline"
                >
                  すべて見る →
                </Link>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {fallbackBreaking.map((article) => {
                  const productTag = article.tags.find((t) => t.tag.axis === "PRODUCT");
                  return (
                    <BreakingCard
                      key={article.id}
                      slug={article.slug}
                      title={article.title}
                      summary3={article.summary3}
                      productTag={productTag?.tag.name}
                      recommendation={article.recommendation}
                      publishedAt={article.publishedAt?.toISOString()}
                      sourceUrl={article.sourceUrl}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* ━━━ セクション2: 詳細 ━━━ */}
          {fallbackDetailed.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h2 className="text-lg font-bold text-gray-900">詳しい情報</h2>
                <span className="text-sm text-gray-400">— 何が変わったか</span>
                <Link
                  href="/latest?depth=detailed"
                  className="ml-auto text-sm text-blue-600 hover:underline"
                >
                  すべて見る →
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {fallbackDetailed.map((article) => {
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
                })}
              </div>
            </section>
          )}

          {/* ━━━ セクション3: 深掘り ━━━ */}
          {fallbackDeep.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xl">🔬</span>
                <h2 className="text-lg font-bold text-gray-900">深い情報</h2>
                <span className="text-sm text-gray-400">— なぜ重要か、どう使うか</span>
                <Link
                  href="/latest?depth=deep"
                  className="ml-auto text-sm text-purple-600 hover:underline"
                >
                  すべて見る →
                </Link>
              </div>
              <div className="grid gap-4">
                {fallbackDeep.map((article) => {
                  const productTag = article.tags.find((t) => t.tag.axis === "PRODUCT");
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
                      productTag={productTag?.tag.name}
                      publishedAt={article.publishedAt?.toISOString()}
                      sourceUrl={article.sourceUrl}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
