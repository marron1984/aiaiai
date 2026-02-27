import { prisma } from "@/lib/prisma";
import { ArticleCard } from "@/components/ArticleCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "検索",
  description: "AI情報を検索",
};

type Props = { searchParams: Promise<{ q?: string; product?: string; level?: string }> };

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: Props) {
  const { q, product } = await searchParams;

  const articles = q
    ? await prisma.article.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { summary3: { contains: q, mode: "insensitive" } },
            { summaryLong: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { compositeScore: "desc" },
        take: 30,
        include: {
          tags: { include: { tag: true } },
        },
      })
    : [];

  const productTags = await prisma.tag.findMany({
    where: { axis: "PRODUCT" },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">検索</h1>

      {/* 検索フォーム */}
      <form className="mb-6" action="/search" method="GET">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q || ""}
            placeholder="キーワードで検索..."
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            検索
          </button>
        </div>

        {/* フィルタ */}
        <div className="mt-3 flex flex-wrap gap-2">
          {productTags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name="product"
                value={tag.slug}
                defaultChecked={product === tag.slug}
                className="rounded border-gray-300"
              />
              {tag.name}
            </label>
          ))}
        </div>
      </form>

      {/* 結果 */}
      {q && (
        <p className="mb-4 text-sm text-gray-500">
          「{q}」の検索結果: {articles.length}件
        </p>
      )}

      {articles.length > 0 ? (
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
      ) : (
        q && <p className="text-gray-500">該当する記事が見つかりません。</p>
      )}
    </div>
  );
}
