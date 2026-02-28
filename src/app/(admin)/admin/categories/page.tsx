import { prisma } from "@/lib/prisma";
import {
  toggleCategory,
  moveCategoryUp,
  moveCategoryDown,
  createCategory,
  deleteCategory,
} from "@/lib/actions";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { safeQuery } from "@/lib/safe-query";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const { data: allCategories, error } = await safeQuery(
    () =>
      prisma.hubCategory.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          children: { orderBy: { sortOrder: "asc" } },
          parent: true,
        },
      }),
    []
  );

  // トップレベルのみ
  const topCategories = allCategories.filter((c) => !c.parentId);

  const { data: tags } = await safeQuery(
    () =>
      prisma.tag.findMany({
        where: { axis: "PRODUCT" },
        orderBy: { name: "asc" },
      }),
    []
  );

  type CategoryItem = {
    id: string;
    name: string;
    slug: string;
    icon: string;
    tagSlug: string;
    sortOrder: number;
    isActive: boolean;
    parentId: string | null;
    description: string | null;
  };

  function CategoryRow({
    cat,
    idx,
    total,
    indent = false,
  }: {
    cat: CategoryItem;
    idx: number;
    total: number;
    indent?: boolean;
  }) {
    return (
      <tr key={cat.id} className={`border-b ${indent ? "bg-gray-50/50" : ""}`}>
        <td className="py-2 text-gray-400">{cat.sortOrder}</td>
        <td className="py-2 text-xl">
          {indent && <span className="mr-1 text-xs text-gray-300">└</span>}
          {cat.icon}
        </td>
        <td className={`py-2 ${indent ? "pl-4 text-gray-700" : "font-medium"}`}>
          {cat.name}
        </td>
        <td className="py-2 text-gray-500">{cat.slug}</td>
        <td className="py-2 text-gray-500">{cat.tagSlug}</td>
        <td className="py-2 text-xs text-gray-400">
          {cat.parentId ? (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">
              サブ
            </span>
          ) : (
            "—"
          )}
        </td>
        <td className="py-2">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              cat.isActive
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {cat.isActive ? "有効" : "無効"}
          </span>
        </td>
        <td className="py-2">
          <div className="flex items-center gap-1">
            <form action={toggleCategory}>
              <input type="hidden" name="id" value={cat.id} />
              <button
                type="submit"
                className={`rounded px-2 py-1 text-xs font-medium ${
                  cat.isActive
                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                {cat.isActive ? "無効化" : "有効化"}
              </button>
            </form>
            {idx > 0 && (
              <form action={moveCategoryUp}>
                <input type="hidden" name="id" value={cat.id} />
                <button
                  type="submit"
                  className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                  title="上へ"
                >
                  ↑
                </button>
              </form>
            )}
            {idx < total - 1 && (
              <form action={moveCategoryDown}>
                <input type="hidden" name="id" value={cat.id} />
                <button
                  type="submit"
                  className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                  title="下へ"
                >
                  ↓
                </button>
              </form>
            )}
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={cat.id} />
              <button
                type="submit"
                className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
              >
                削除
              </button>
            </form>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">カテゴリ管理</h1>
      <p className="mb-6 text-sm text-gray-500">
        トップページに表示するカテゴリの有効/無効切り替え、表示順の変更、新規追加ができます。
        サブカテゴリは親カテゴリの下にインデントして表示されます。
      </p>

      {error && <DbErrorBanner />}

      {/* カテゴリ一覧 */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          カテゴリ一覧
        </h2>
        {topCategories.length === 0 ? (
          <p className="text-sm text-gray-500">カテゴリなし</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">順序</th>
                  <th className="pb-2">icon</th>
                  <th className="pb-2">カテゴリ名</th>
                  <th className="pb-2">スラッグ</th>
                  <th className="pb-2">タグ</th>
                  <th className="pb-2">種別</th>
                  <th className="pb-2">状態</th>
                  <th className="pb-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {topCategories.map((cat, idx) => (
                  <>
                    <CategoryRow
                      key={cat.id}
                      cat={cat}
                      idx={idx}
                      total={topCategories.length}
                    />
                    {cat.children?.map((sub, subIdx) => (
                      <CategoryRow
                        key={sub.id}
                        cat={sub}
                        idx={subIdx}
                        total={cat.children.length}
                        indent
                      />
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* カテゴリ新規追加 */}
      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          カテゴリを追加
        </h2>
        <form action={createCategory} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                カテゴリ名
              </label>
              <input
                name="name"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="例: AI全般"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                スラッグ
              </label>
              <input
                name="slug"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="例: ai"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                アイコン（絵文字）
              </label>
              <input
                name="icon"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="例: 🤖"
                defaultValue="📌"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                対応タグスラッグ
              </label>
              <select
                name="tagSlug"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.slug}>
                    {tag.name} ({tag.slug})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                親カテゴリ（サブカテゴリの場合）
              </label>
              <select
                name="parentId"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">なし（トップレベル）</option>
                {topCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              説明（任意）
            </label>
            <input
              name="description"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="例: ChatGPT、Claude、Gemini等の最新情報"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            追加
          </button>
        </form>
      </section>
    </div>
  );
}
