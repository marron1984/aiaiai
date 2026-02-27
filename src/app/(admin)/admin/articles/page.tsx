import { prisma } from "@/lib/prisma";
import { publishArticle, unpublishArticle, deleteArticle } from "@/lib/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  DRAFT: { label: "下書き", class: "badge-monitor" },
  REVIEW: { label: "レビュー", class: "badge-importance" },
  PUBLISHED: { label: "公開", class: "badge-try" },
  UNPUBLISHED: { label: "非公開", class: "badge-ignore" },
  DELETED: { label: "削除", class: "badge-urgency" },
};

const REC_LABELS: Record<string, string> = {
  TRY: "今すぐ試す",
  MONITOR: "注視",
  IGNORE: "様子見",
};

export default async function AdminArticlesPage() {
  const articles = await prisma.article.findMany({
    where: { status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      tags: { include: { tag: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">記事管理</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4">タイトル</th>
              <th className="pb-2 pr-4">状態</th>
              <th className="pb-2 pr-4">スコア</th>
              <th className="pb-2 pr-4">推奨</th>
              <th className="pb-2 pr-4">作成日</th>
              <th className="pb-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => {
              const status = STATUS_LABELS[article.status] ?? {
                label: article.status,
                class: "badge-ignore",
              };
              return (
                <tr key={article.id} className="border-b hover:bg-gray-50">
                  <td className="max-w-md py-3 pr-4">
                    <Link
                      href={`/article/${article.slug}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {article.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {article.tags.map(({ tag }) => (
                        <span
                          key={tag.id}
                          className="badge badge-trust text-xs"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`badge ${status.class}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">
                    {article.compositeScore}
                  </td>
                  <td className="py-3 pr-4 text-gray-600">
                    {REC_LABELS[article.recommendation] ??
                      article.recommendation}
                  </td>
                  <td className="py-3 pr-4 text-gray-400">
                    {article.createdAt.toLocaleDateString("ja-JP")}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      {(article.status === "DRAFT" ||
                        article.status === "REVIEW") && (
                        <form action={publishArticle}>
                          <input type="hidden" name="id" value={article.id} />
                          <button
                            type="submit"
                            className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            公開
                          </button>
                        </form>
                      )}
                      {article.status === "PUBLISHED" && (
                        <form action={unpublishArticle}>
                          <input type="hidden" name="id" value={article.id} />
                          <button
                            type="submit"
                            className="rounded bg-orange-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-orange-600"
                          >
                            非公開
                          </button>
                        </form>
                      )}
                      {article.status !== "DELETED" && (
                        <form action={deleteArticle}>
                          <input type="hidden" name="id" value={article.id} />
                          <button
                            type="submit"
                            className="rounded bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                          >
                            削除
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {articles.length === 0 && (
        <p className="mt-8 text-center text-gray-500">
          記事がありません。ソースを追加して収集を実行してください。
        </p>
      )}
    </div>
  );
}
