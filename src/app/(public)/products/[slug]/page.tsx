import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) return {};
  return {
    title: `${tag.name} の最新アップデート`,
    description: `${tag.name}に関する最新のAIアップデート情報`,
  };
}

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) notFound();

  const articleTags = await prisma.articleTag.findMany({
    where: { tagId: tag.id },
    include: {
      article: {
        include: {
          tags: { include: { tag: true } },
        },
      },
    },
    orderBy: { article: { compositeScore: "desc" } },
    take: 30,
  });

  const articles = articleTags
    .map((at) => at.article)
    .filter((a) => a.status === "PUBLISHED");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{tag.name}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {tag.name}に関する最新アップデート情報
      </p>

      {articles.length === 0 ? (
        <p className="text-gray-500">
          このプロダクトの記事はまだありません。
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
