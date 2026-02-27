import { prisma } from "@/lib/prisma";
import { ArticleCard } from "@/components/ArticleCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "最新記事",
  description: "AI関連の最新アップデート情報一覧",
};

export const dynamic = "force-dynamic";

export default async function LatestPage() {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 30,
    include: {
      tags: { include: { tag: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">最新記事</h1>

      {articles.length === 0 ? (
        <p className="text-gray-500">まだ記事がありません。</p>
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
    </div>
  );
}
