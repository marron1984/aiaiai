import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { safeQuery } from "@/lib/safe-query";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: tag } = await safeQuery(
    () => prisma.tag.findUnique({ where: { slug } }),
    null
  );
  if (!tag) return {};
  return {
    title: `${tag.name} のトピック`,
    description: `${tag.name}に関するAI情報トピック`,
  };
}

export const dynamic = "force-dynamic";

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const { data: tag, error } = await safeQuery(
    () => prisma.tag.findUnique({ where: { slug } }),
    null
  );

  if (error) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">トピック</h1>
        <DbErrorBanner />
      </div>
    );
  }

  if (!tag) notFound();

  const { data: articleTags } = await safeQuery(
    () =>
      prisma.articleTag.findMany({
        where: { tagId: tag.id },
        include: {
          article: { include: { tags: { include: { tag: true } } } },
        },
        orderBy: { article: { publishedAt: "desc" } },
        take: 30,
      }),
    []
  );

  const articles = articleTags
    .map((at) => at.article)
    .filter((a) => a.status === "PUBLISHED");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{tag.name}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {tag.name}に関するトピック
      </p>

      {articles.length === 0 ? (
        <p className="text-gray-500">このトピックの記事はまだありません。</p>
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
