import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プロダクト比較",
  description: "AI主要プロダクトの最新アップデート比較",
};

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const productTags = await prisma.tag.findMany({
    where: { axis: "PRODUCT" },
    orderBy: { sortOrder: "asc" },
  });

  // 各プロダクトの最新記事を取得
  const productsWithArticles = await Promise.all(
    productTags.map(async (tag) => {
      const articleTags = await prisma.articleTag.findMany({
        where: {
          tagId: tag.id,
          article: { status: "PUBLISHED" },
        },
        include: { article: true },
        orderBy: { article: { publishedAt: "desc" } },
        take: 3,
      });
      return {
        tag,
        articles: articleTags.map((at) => at.article),
        totalCount: await prisma.articleTag.count({
          where: {
            tagId: tag.id,
            article: { status: "PUBLISHED" },
          },
        }),
      };
    })
  );

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        プロダクト比較
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        主要AIプロダクトの最新アップデートを比較
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {productsWithArticles.map(({ tag, articles, totalCount }) => (
          <div
            key={tag.id}
            className="rounded-lg border border-gray-200 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {tag.name}
              </h2>
              <span className="text-xs text-gray-400">{totalCount}件</span>
            </div>

            {articles.length === 0 ? (
              <p className="text-sm text-gray-400">記事なし</p>
            ) : (
              <ul className="space-y-2">
                {articles.map((article) => (
                  <li key={article.id}>
                    <Link
                      href={`/article/${article.slug}`}
                      className="block text-sm text-gray-700 hover:text-blue-600"
                    >
                      {article.title}
                    </Link>
                    <span className="text-xs text-gray-400">
                      スコア {article.compositeScore}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href={`/products/${tag.slug}`}
              className="mt-3 block text-sm text-blue-600 hover:underline"
            >
              すべて見る →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
