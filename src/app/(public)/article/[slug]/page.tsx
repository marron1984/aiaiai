import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { RECOMMENDATION_LABELS, SITE_URL, SITE_NAME } from "@/lib/constants";
import { getScoreRank } from "@/lib/score";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { safeQuery } from "@/lib/safe-query";
import type { Metadata } from "next";
import Link from "next/link";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: article } = await safeQuery(
    () => prisma.article.findUnique({ where: { slug } }),
    null
  );
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary3,
    openGraph: {
      title: article.title,
      description: article.summary3,
      url: `${SITE_URL}/article/${slug}`,
      type: "article",
    },
    alternates: {
      canonical: `${SITE_URL}/article/${slug}`,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const { data: article, error } = await safeQuery(
    () =>
      prisma.article.findUnique({
        where: { slug },
        include: {
          tags: { include: { tag: true } },
          topicCluster: {
            include: {
              rawItems: { include: { source: true }, take: 10 },
            },
          },
        },
      }),
    null
  );

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">記事</h1>
        <DbErrorBanner />
      </div>
    );
  }

  if (!article || article.status === "DELETED") {
    notFound();
  }

  const rec = RECOMMENDATION_LABELS[article.recommendation];
  const rank = getScoreRank(article.compositeScore);

  // Article JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary3,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    url: `${SITE_URL}/article/${slug}`,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl">
        {/* タグ */}
        <div className="mb-4 flex flex-wrap gap-2">
          {article.tags.map(({ tag }) => (
            <Link
              key={tag.id}
              href={
                tag.axis === "PRODUCT"
                  ? `/products/${tag.slug}`
                  : `/topics/${tag.slug}`
              }
              className="badge badge-trust"
            >
              {tag.name}
            </Link>
          ))}
          <span className={`badge ${rec.color}`}>{rec.label}</span>
        </div>

        {/* タイトル */}
        <h1 className="text-2xl font-bold leading-tight text-gray-900 md:text-3xl">
          {article.title}
        </h1>

        {/* メタ情報 */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          {article.publishedAt && (
            <time dateTime={article.publishedAt.toISOString()}>
              {article.publishedAt.toLocaleDateString("ja-JP")}
            </time>
          )}
          <span>
            スコア {article.compositeScore} ({rank})
          </span>
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            原典を見る
          </a>
        </div>

        {/* 3行要約 */}
        <section className="mt-6 rounded-lg bg-blue-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-blue-800">
            3行要約
          </h2>
          <p className="text-sm leading-relaxed text-blue-900">
            {article.summary3}
          </p>
        </section>

        {/* スコア詳細 */}
        <section className="mt-6 grid grid-cols-5 gap-2 text-center text-xs">
          {[
            { label: "信頼性", value: article.trustScore },
            { label: "重要度", value: article.importanceScore },
            { label: "有用性", value: article.usefulnessScore },
            { label: "新規性", value: article.noveltyScore },
            { label: "緊急度", value: article.urgencyScore },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-md border border-gray-200 p-2"
            >
              <div className="text-gray-500">{s.label}</div>
              <div className="text-lg font-bold text-gray-900">{s.value}</div>
            </div>
          ))}
        </section>

        {/* 詳細情報 */}
        {article.whatChanged && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">
              何が変わったか
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {article.whatChanged}
            </p>
          </section>
        )}

        {article.whoImpacted && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">
              誰に影響があるか
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {article.whoImpacted}
            </p>
          </section>
        )}

        {article.actions && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">
              実務でどう使えるか
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {article.actions}
            </p>
          </section>
        )}

        {article.summaryLong && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">詳細要約</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {article.summaryLong}
            </p>
          </section>
        )}

        {/* 関連ソース */}
        {article.topicCluster &&
          article.topicCluster.rawItems.length > 1 && (
            <section className="mt-8 rounded-lg border border-gray-200 p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                関連ソース（Topic Cluster）
              </h2>
              <ul className="space-y-2">
                {article.topicCluster.rawItems.map((item) => (
                  <li key={item.id} className="text-sm">
                    <a
                      href={item.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {item.title}
                    </a>
                    <span className="ml-2 text-gray-400">
                      ({item.source.name})
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

        {/* 出典明記 */}
        <section className="mt-8 rounded-md border-l-4 border-gray-300 bg-gray-50 p-4 text-xs text-gray-500">
          <p>
            本記事は原典の要約です。詳細は
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              原典
            </a>
            をご確認ください。引用部分の著作権は原著作者に帰属します。
          </p>
        </section>
      </article>
    </>
  );
}
