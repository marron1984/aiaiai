import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  const jobs = await prisma.jobRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { source: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">ジョブ管理</h1>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2">ソース</th>
            <th className="pb-2">状態</th>
            <th className="pb-2">取得件数</th>
            <th className="pb-2">開始</th>
            <th className="pb-2">完了</th>
            <th className="pb-2">エラー</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b">
              <td className="py-2 font-medium text-gray-900">
                {job.source.name}
              </td>
              <td className="py-2">
                <span
                  className={`badge ${
                    job.status === "COMPLETED"
                      ? "badge-try"
                      : job.status === "FAILED"
                        ? "badge-urgency"
                        : job.status === "RUNNING"
                          ? "badge-monitor"
                          : "badge-ignore"
                  }`}
                >
                  {job.status}
                </span>
              </td>
              <td className="py-2 text-gray-600">{job.itemsFetched}</td>
              <td className="py-2 text-gray-400">
                {job.startedAt?.toLocaleString("ja-JP") ?? "—"}
              </td>
              <td className="py-2 text-gray-400">
                {job.completedAt?.toLocaleString("ja-JP") ?? "—"}
              </td>
              <td className="max-w-xs truncate py-2 text-red-500">
                {job.error || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {jobs.length === 0 && (
        <p className="mt-4 text-center text-sm text-gray-500">
          ジョブ実行履歴なし
        </p>
      )}
    </div>
  );
}
