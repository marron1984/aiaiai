import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleCard } from "@/components/ArticleCard";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";
import { safeQuery } from "@/lib/safe-query";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data: articles, error: articlesError } = await safeQuery(
    () =>
      prisma.article.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { compositeScore: "desc" },
        take: 10,
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

  return (
    <div>
      {/* ヒーロー */}
      <section className="mb-12 rounded-2xl bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-6 py-12 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
          {SITE_NAME}
        </h1>
        <p className="mt-4 text-lg font-medium text-gray-700 md:text-xl">{SITE_DESCRIPTION}</p>
        <p className="mt-3 text-sm text-gray-500">
          公式一次情報を中心に収集・重複統合・実務者向け要約で「読む価値順」に提示
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/latest"
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            最新記事を見る
          </Link>
          <Link
            href="/search"
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            検索する
          </Link>
        </div>
      </section>

      {articlesError && <DbErrorBanner />}

      {/* プロダクト別ナビ */}
      {productTags.length > 0 && (
        <section className="mb-8">
          <div className="flex flex-wrap gap-2">
            {productTags.map((tag) => (
              <Link
                key={tag.id}
                href={`/products/${tag.slug}`}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 注目記事 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            注目のアップデート
          </h2>
          <Link
            href="/latest"
            className="text-sm text-blue-600 hover:underline"
          >
            すべて見る →
          </Link>
        </div>

        {articles.length === 0 && !articlesError ? (
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
          <div className="grid gap-4 md:grid-cols-2">
            {articles.map((article) => {
              const productTag = article.tags.find(
                (t) => t.tag.axis === "PRODUCT"
              );
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
                  publishedAt={article.publishedAt?.toISOString()}
                  sourceUrl={article.sourceUrl}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
