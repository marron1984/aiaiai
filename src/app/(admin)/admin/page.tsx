import { prisma } from "@/lib/prisma";
import { triggerManualIngest } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [sourceCount, articleCount, publishedCount, draftCount, jobRunCount, recentJobs] =
    await Promise.all([
      prisma.source.count(),
      prisma.article.count(),
      prisma.article.count({ where: { status: "PUBLISHED" } }),
      prisma.article.count({ where: { status: "DRAFT" } }),
      prisma.jobRun.count(),
      prisma.jobRun.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { source: true },
      }),
    ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          管理ダッシュボード
        </h1>
        <form action={triggerManualIngest}>
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            手動収集を実行
          </button>
        </form>
      </div>

      {/* 統計カード */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "ソース", value: sourceCount },
          { label: "記事（全体）", value: articleCount },
          { label: "公開済み", value: publishedCount },
          { label: "下書き", value: draftCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 p-4"
          >
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div className="text-2xl font-bold text-gray-900">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* 直近のジョブ */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          直近のジョブ実行
        </h2>
        {recentJobs.length === 0 ? (
          <p className="text-sm text-gray-500">ジョブ実行履歴なし</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">ソース</th>
                <th className="pb-2">状態</th>
                <th className="pb-2">取得件数</th>
                <th className="pb-2">実行日時</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job) => (
                <tr key={job.id} className="border-b">
                  <td className="py-2">{job.source.name}</td>
                  <td className="py-2">
                    <span
                      className={`badge ${
                        job.status === "COMPLETED"
                          ? "badge-try"
                          : job.status === "FAILED"
                            ? "badge-urgency"
                            : "badge-monitor"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="py-2">{job.itemsFetched}</td>
                  <td className="py-2 text-gray-400">
                    {job.createdAt.toLocaleString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
