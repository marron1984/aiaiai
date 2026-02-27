import { prisma } from "@/lib/prisma";
import { ArticleCard } from "@/components/ArticleCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "週次ダイジェスト",
  description: "今週の注目AIアップデートまとめ",
};

export const dynamic = "force-dynamic";

export default async function WeeklyPage() {
  // 直近7日間の記事をスコア順で取得
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: oneWeekAgo },
    },
    orderBy: { compositeScore: "desc" },
    take: 20,
    include: {
      tags: { include: { tag: true } },
    },
  });

  const today = new Date().toLocaleDateString("ja-JP");
  const weekAgo = oneWeekAgo.toLocaleDateString("ja-JP");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        週次ダイジェスト
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {weekAgo} 〜 {today} の注目アップデート（読む価値順）
      </p>

      {articles.length === 0 ? (
        <p className="text-gray-500">
          今週の記事はまだありません。
        </p>
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
