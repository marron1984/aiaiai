import { prisma } from "@/lib/prisma";
import { createSource, toggleSource, syncSources } from "@/lib/actions";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { safeQuery } from "@/lib/safe-query";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const { data: sources, error } = await safeQuery(
    () =>
      prisma.source.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { rawItems: true, jobRuns: true } },
        },
      }),
    []
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ソース管理</h1>
        <form action={syncSources}>
          <button
            type="submit"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
          >
            ソース定義を同期
          </button>
        </form>
      </div>

      {error && <DbErrorBanner />}

      {/* ソース追加フォーム */}
      <details className="mb-8 rounded-lg border border-gray-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          + 新しいソースを追加
        </summary>
        <form action={createSource} className="border-t p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                名前 *
              </label>
              <input
                name="name"
                required
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="OpenAI Developers Changelog"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                スラッグ *
              </label>
              <input
                name="slug"
                required
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="openai-dev-changelog"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                種別 *
              </label>
              <select
                name="type"
                required
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="OFFICIAL">OFFICIAL</option>
                <option value="RSS">RSS</option>
                <option value="GITHUB">GITHUB</option>
                <option value="X">X</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                頻度
              </label>
              <select
                name="frequency"
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="DAILY">DAILY</option>
                <option value="HOURLY">HOURLY</option>
                <option value="WEEKLY">WEEKLY</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                URL *
              </label>
              <input
                name="url"
                type="url"
                required
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="https://developers.openai.com/changelog/"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                フィードURL（RSSの場合）
              </label>
              <input
                name="feedUrl"
                type="url"
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="https://developers.openai.com/changelog/rss.xml"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                信頼度スコア (0-100)
              </label>
              <input
                name="trustScore"
                type="number"
                min="0"
                max="100"
                defaultValue="80"
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                法務メモ
              </label>
              <input
                name="legalNotes"
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="公式RSS。要約・引用のみ。"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              追加
            </button>
          </div>
        </form>
      </details>

      {/* ソース一覧 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4">名前</th>
              <th className="pb-2 pr-4">種別</th>
              <th className="pb-2 pr-4">頻度</th>
              <th className="pb-2 pr-4">信頼度</th>
              <th className="pb-2 pr-4">取得数</th>
              <th className="pb-2 pr-4">状態</th>
              <th className="pb-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-b hover:bg-gray-50">
                <td className="py-3 pr-4">
                  <div className="font-medium text-gray-900">{source.name}</div>
                  <div className="mt-0.5 max-w-xs truncate text-xs text-gray-400">
                    {source.url}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className="badge badge-trust">{source.type}</span>
                </td>
                <td className="py-3 pr-4 text-gray-600">{source.frequency}</td>
                <td className="py-3 pr-4 text-gray-600">{source.trustScore}</td>
                <td className="py-3 pr-4 text-gray-600">
                  {source._count.rawItems}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`badge ${source.isActive ? "badge-try" : "badge-ignore"}`}
                  >
                    {source.isActive ? "有効" : "停止"}
                  </span>
                </td>
                <td className="py-3">
                  <form action={toggleSource}>
                    <input type="hidden" name="id" value={source.id} />
                    <button
                      type="submit"
                      className={`rounded px-2.5 py-1 text-xs font-medium ${
                        source.isActive
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {source.isActive ? "停止" : "有効化"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sources.length === 0 && !error && (
        <p className="mt-4 text-center text-sm text-gray-500">
          ソースが登録されていません。上のフォームから追加してください。
        </p>
      )}
    </div>
  );
}
