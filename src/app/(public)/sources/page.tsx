import { prisma } from "@/lib/prisma";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { safeQuery } from "@/lib/safe-query";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ソース一覧 — 取得した全コンテンツ",
  description: "各ソースから取得したすべてのコンテンツを確認できます",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ source?: string; page?: string }>;

const SOURCE_TYPE_LABELS: Record<string, string> = {
  OFFICIAL: "公式",
  RSS: "RSS",
  GITHUB: "GitHub",
  X: "X",
};

const SOURCE_TYPE_COLORS: Record<string, string> = {
  OFFICIAL: "bg-blue-50 text-blue-700 ring-blue-200",
  RSS: "bg-orange-50 text-orange-700 ring-orange-200",
  GITHUB: "bg-gray-50 text-gray-700 ring-gray-200",
  X: "bg-sky-50 text-sky-700 ring-sky-200",
};

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { source: selectedSourceSlug, page: pageStr } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageStr || "1"));
  const perPage = 30;

  // ソース一覧を取得
  const { data: sources, error: sourceError } = await safeQuery(
    () =>
      prisma.source.findMany({
        where: { isActive: true },
        orderBy: [{ type: "asc" }, { name: "asc" }],
        include: {
          _count: { select: { rawItems: true } },
        },
      }),
    []
  );

  // RawItem一覧を取得（フィルター付き）
  const where = selectedSourceSlug
    ? { source: { slug: selectedSourceSlug } }
    : {};

  const { data: totalCount } = await safeQuery(
    () => prisma.rawItem.count({ where }),
    0
  );

  const { data: rawItems, error: itemError } = await safeQuery(
    () =>
      prisma.rawItem.findMany({
        where,
        orderBy: { fetchedAt: "desc" },
        skip: (currentPage - 1) * perPage,
        take: perPage,
        include: {
          source: true,
        },
      }),
    []
  );

  const totalPages = Math.ceil(totalCount / perPage);
  const error = sourceError || itemError;

  // 現在選択中のソース
  const selectedSource = selectedSourceSlug
    ? sources.find((s) => s.slug === selectedSourceSlug)
    : null;

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-8 rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">
          ソース一覧
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          各ソースから取得したすべてのコンテンツを確認できます
        </p>
        <p className="mt-1 text-xs text-gray-400">
          全 {totalCount} 件のコンテンツ
        </p>
      </div>

      {error && <DbErrorBanner />}

      <div className="flex flex-col gap-6 md:flex-row">
        {/* サイドバー: ソース一覧 */}
        <aside className="w-full flex-shrink-0 md:w-64">
          <div className="sticky top-20 rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-bold text-gray-900">
              ソースで絞り込み
            </h2>

            {/* 全件リンク */}
            <Link
              href="/sources"
              className={`mb-2 block rounded-md px-3 py-2 text-sm transition-colors ${
                !selectedSourceSlug
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              すべて
              <span className="ml-1 text-xs text-gray-400">({totalCount})</span>
            </Link>

            <div className="space-y-1">
              {sources.map((source) => (
                <Link
                  key={source.id}
                  href={`/sources?source=${source.slug}`}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                    selectedSourceSlug === source.slug
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${SOURCE_TYPE_COLORS[source.type] || ""}`}
                    >
                      {SOURCE_TYPE_LABELS[source.type] || source.type}
                    </span>
                    <span className="truncate">{source.name}</span>
                  </span>
                  <span className="ml-2 flex-shrink-0 text-xs text-gray-400">
                    {source._count.rawItems}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* メインコンテンツ: RawItem一覧 */}
        <main className="min-w-0 flex-1">
          {selectedSource && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${SOURCE_TYPE_COLORS[selectedSource.type] || ""}`}
              >
                {SOURCE_TYPE_LABELS[selectedSource.type]}
              </span>
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  {selectedSource.name}
                </h2>
                <a
                  href={selectedSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  {selectedSource.url}
                </a>
              </div>
            </div>
          )}

          {rawItems.length === 0 ? (
            <p className="py-12 text-center text-gray-500">
              {selectedSourceSlug
                ? "このソースからの取得コンテンツはまだありません。"
                : "取得されたコンテンツはまだありません。"}
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {rawItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${SOURCE_TYPE_COLORS[item.source.type] || ""}`}
                          >
                            {item.source.name}
                          </span>
                          {item.publishedAt && (
                            <time
                              dateTime={item.publishedAt.toISOString()}
                              className="text-xs text-gray-400"
                            >
                              {item.publishedAt.toLocaleDateString("ja-JP")}
                            </time>
                          )}
                        </div>

                        <h3 className="text-sm font-medium text-gray-900">
                          <a
                            href={item.canonicalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 hover:underline"
                          >
                            {item.title}
                          </a>
                        </h3>

                        {item.content && (
                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
                            {item.content.slice(0, 200)}
                          </p>
                        )}
                      </div>

                      <a
                        href={item.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                      >
                        開く
                      </a>
                    </div>

                    <div className="mt-2 text-[10px] text-gray-300">
                      取得: {item.fetchedAt.toLocaleString("ja-JP")}
                    </div>
                  </div>
                ))}
              </div>

              {/* ページネーション */}
              {totalPages > 1 && (
                <nav className="mt-6 flex items-center justify-center gap-2">
                  {currentPage > 1 && (
                    <Link
                      href={`/sources?${selectedSourceSlug ? `source=${selectedSourceSlug}&` : ""}page=${currentPage - 1}`}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      前へ
                    </Link>
                  )}

                  <span className="text-sm text-gray-500">
                    {currentPage} / {totalPages} ページ
                  </span>

                  {currentPage < totalPages && (
                    <Link
                      href={`/sources?${selectedSourceSlug ? `source=${selectedSourceSlug}&` : ""}page=${currentPage + 1}`}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      次へ
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
