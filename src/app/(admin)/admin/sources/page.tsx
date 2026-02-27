import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const sources = await prisma.source.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { rawItems: true, jobRuns: true } },
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ソース管理</h1>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2">名前</th>
            <th className="pb-2">種別</th>
            <th className="pb-2">頻度</th>
            <th className="pb-2">信頼度</th>
            <th className="pb-2">取得数</th>
            <th className="pb-2">状態</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id} className="border-b">
              <td className="py-2">
                <div className="font-medium text-gray-900">{source.name}</div>
                <div className="text-xs text-gray-400 truncate max-w-xs">
                  {source.url}
                </div>
              </td>
              <td className="py-2">
                <span className="badge badge-trust">{source.type}</span>
              </td>
              <td className="py-2 text-gray-600">{source.frequency}</td>
              <td className="py-2 text-gray-600">{source.trustScore}</td>
              <td className="py-2 text-gray-600">
                {source._count.rawItems}
              </td>
              <td className="py-2">
                <span
                  className={`badge ${source.isActive ? "badge-try" : "badge-ignore"}`}
                >
                  {source.isActive ? "有効" : "停止"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sources.length === 0 && (
        <p className="mt-4 text-center text-sm text-gray-500">
          ソースが登録されていません。seedデータを投入してください。
        </p>
      )}
    </div>
  );
}
