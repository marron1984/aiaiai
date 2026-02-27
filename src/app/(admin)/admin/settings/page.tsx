import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [legalEvents, auditLogs] = await Promise.all([
    prisma.legalEvent.findMany({
      orderBy: { requestedAt: "desc" },
      take: 20,
      include: { article: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">設定・法務</h1>

      {/* 法務イベント */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          法務リクエスト
        </h2>
        {legalEvents.length === 0 ? (
          <p className="text-sm text-gray-500">法務リクエストなし</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">記事</th>
                <th className="pb-2">種別</th>
                <th className="pb-2">状態</th>
                <th className="pb-2">メモ</th>
                <th className="pb-2">リクエスト日</th>
              </tr>
            </thead>
            <tbody>
              {legalEvents.map((event) => (
                <tr key={event.id} className="border-b">
                  <td className="py-2">{event.article.title}</td>
                  <td className="py-2">{event.requestType}</td>
                  <td className="py-2">
                    <span className="badge badge-monitor">{event.status}</span>
                  </td>
                  <td className="max-w-xs truncate py-2 text-gray-400">
                    {event.notes || "—"}
                  </td>
                  <td className="py-2 text-gray-400">
                    {event.requestedAt.toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 監査ログ */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">監査ログ</h2>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500">監査ログなし</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">日時</th>
                <th className="pb-2">操作者</th>
                <th className="pb-2">アクション</th>
                <th className="pb-2">対象</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="py-2 text-gray-400">
                    {log.createdAt.toLocaleString("ja-JP")}
                  </td>
                  <td className="py-2">{log.actor}</td>
                  <td className="py-2">{log.action}</td>
                  <td className="py-2 text-gray-600">
                    {log.target}
                    {log.targetId && ` (${log.targetId})`}
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
