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

const RANK_COLORS: Record<string, string> = {
  S: "bg-amber-500 text-white",
  A: "bg-blue-600 text-white",
  B: "bg-green-600 text-white",
  C: "bg-gray-500 text-white",
  D: "bg-gray-400 text-white",
};

const LEVEL_COLORS: Record<string, string> = {
  "L1: 活用": "bg-green-50 text-green-700 ring-1 ring-green-200",
  "L2: 定着/自動化": "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
  "L3: 実装": "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
};

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

  const productTags = article.tags.filter((t) => t.tag.axis === "PRODUCT");
  const levelTags = article.tags.filter((t) => t.tag.axis === "LEVEL");
  const themeTags = article.tags.filter((t) => t.tag.axis === "THEME");
  const usecaseTags = article.tags.filter((t) => t.tag.axis === "USECASE");

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
        {/* パンくずリスト */}
        <nav className="mb-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            トップ
          </Link>
          <span className="mx-2">/</span>
          <Link href="/latest" className="hover:text-gray-600">
            最新
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">記事</span>
        </nav>

        {/* ヘッダーエリア */}
        <header className="mb-8">
          {/* タグ一覧 */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {/* ランクバッジ */}
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${RANK_COLORS[rank] || RANK_COLORS.C}`}
            >
              {rank}
            </span>

            {/* 推奨アクション */}
            <span className={`badge ${rec.color} text-sm`}>{rec.label}</span>

            {/* プロダクトタグ */}
            {productTags.map(({ tag }) => (
              <Link
                key={tag.id}
                href={`/products/${tag.slug}`}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200 transition-colors hover:bg-blue-100"
              >
                {tag.name}
              </Link>
            ))}

            {/* レベルタグ */}
            {levelTags.map(({ tag }) => (
              <Link
                key={tag.id}
                href={`/topics/${tag.slug}`}
                className={`rounded-full px-3 py-1 text-xs font-medium ${LEVEL_COLORS[tag.name] || "bg-gray-50 text-gray-700 ring-1 ring-gray-200"}`}
              >
                {tag.name}
              </Link>
            ))}

            {/* テーマタグ */}
            {themeTags.map(({ tag }) => (
              <Link
                key={tag.id}
                href={`/topics/${tag.slug}`}
                className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 transition-colors hover:bg-gray-100"
              >
                {tag.name}
              </Link>
            ))}

            {/* 実務用途タグ */}
            {usecaseTags.map(({ tag }) => (
              <Link
                key={tag.id}
                href={`/topics/${tag.slug}`}
                className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
              >
                {tag.name}
              </Link>
            ))}
          </div>

          {/* タイトル */}
          <h1 className="text-2xl font-bold leading-tight text-gray-900 md:text-3xl">
            {article.title}
          </h1>

          {/* メタ情報 */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            {article.publishedAt && (
              <time
                dateTime={article.publishedAt.toISOString()}
                className="flex items-center gap-1"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {article.publishedAt.toLocaleDateString("ja-JP")}
              </time>
            )}
            <span className="text-gray-300">|</span>
            <span>
              読む価値スコア: <strong className="text-gray-700">{article.compositeScore}</strong>
            </span>
          </div>
        </header>

        {/* 3行要約 — 最も目立つセクション */}
        <section className="mb-8 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-blue-900">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            3行でわかるポイント
          </h2>
          <div className="space-y-2">
            {article.summary3.split("\n").map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-gray-800">{line}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 実務者向け3カラム情報 */}
        {(article.whatChanged || article.whoImpacted || article.actions) && (
          <section className="mb-8 grid gap-4 md:grid-cols-3">
            {article.whatChanged && (
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-orange-100">
                    <svg className="h-3.5 w-3.5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </span>
                  何が変わったか
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {article.whatChanged}
                </p>
              </div>
            )}

            {article.whoImpacted && (
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-100">
                    <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  誰に影響があるか
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {article.whoImpacted}
                </p>
              </div>
            )}

            {article.actions && (
              <div className="rounded-lg border border-green-200 bg-green-50/50 p-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-green-100">
                    <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </span>
                  実務でどう使えるか
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {article.actions}
                </p>
              </div>
            )}
          </section>
        )}

        {/* 詳細要約 */}
        {article.summaryLong && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-bold text-gray-900">詳細</h2>
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <p className="text-sm leading-7 text-gray-700">
                {article.summaryLong}
              </p>
            </div>
          </section>
        )}

        {/* スコア詳細 */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-gray-900">
            スコア詳細
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "信頼性", value: article.trustScore, color: "text-blue-600" },
              { label: "重要度", value: article.importanceScore, color: "text-red-600" },
              { label: "有用性", value: article.usefulnessScore, color: "text-green-600" },
              { label: "新規性", value: article.noveltyScore, color: "text-purple-600" },
              { label: "緊急度", value: article.urgencyScore, color: "text-orange-600" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-gray-200 bg-white p-3 text-center"
              >
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className={`mt-1 text-xl font-bold ${s.color}`}>
                  {s.value}
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${s.color.replace("text-", "bg-")}`}
                    style={{ width: `${s.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 関連ソース */}
        {article.topicCluster &&
          article.topicCluster.rawItems.length > 1 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-bold text-gray-900">
                関連ソース
              </h2>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <ul className="space-y-3">
                  {article.topicCluster.rawItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                    >
                      <span className="mt-0.5 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {item.source.name}
                      </span>
                      <div>
                        <a
                          href={item.canonicalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {item.title}
                        </a>
                        {item.publishedAt && (
                          <span className="ml-2 text-xs text-gray-400">
                            {item.publishedAt.toLocaleDateString("ja-JP")}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

        {/* 原典リンク */}
        <div className="mb-8 flex justify-center">
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            原典を読む
          </a>
        </div>

        {/* 出典明記 */}
        <section className="rounded-lg border-l-4 border-gray-300 bg-gray-50 p-4 text-xs text-gray-500">
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
