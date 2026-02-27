import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      tags: { include: { tag: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">記事管理</h1>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2">タイトル</th>
            <th className="pb-2">状態</th>
            <th className="pb-2">スコア</th>
            <th className="pb-2">推奨</th>
            <th className="pb-2">作成日</th>
            <th className="pb-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <tr key={article.id} className="border-b">
              <td className="max-w-md truncate py-2">
                <Link
                  href={`/article/${article.slug}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {article.title}
                </Link>
                <div className="flex gap-1 mt-1">
                  {article.tags.map(({ tag }) => (
                    <span key={tag.id} className="badge badge-trust text-xs">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-2">
                <span
                  className={`badge ${
                    article.status === "PUBLISHED"
                      ? "badge-try"
                      : article.status === "DRAFT"
                        ? "badge-monitor"
                        : "badge-ignore"
                  }`}
                >
                  {article.status}
                </span>
              </td>
              <td className="py-2 text-gray-600">
                {article.compositeScore}
              </td>
              <td className="py-2 text-gray-600">
                {article.recommendation}
              </td>
              <td className="py-2 text-gray-400">
                {article.createdAt.toLocaleDateString("ja-JP")}
              </td>
              <td className="py-2">
                <form
                  action={`/api/admin/articles/${article.id}`}
                  method="POST"
                >
                  {article.status === "DRAFT" && (
                    <button
                      type="submit"
                      name="action"
                      value="publish"
                      className="mr-2 text-xs text-blue-600 hover:underline"
                    >
                      公開
                    </button>
                  )}
                  {article.status === "PUBLISHED" && (
                    <button
                      type="submit"
                      name="action"
                      value="unpublish"
                      className="mr-2 text-xs text-orange-600 hover:underline"
                    >
                      非公開
                    </button>
                  )}
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
