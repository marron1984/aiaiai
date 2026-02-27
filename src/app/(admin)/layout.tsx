import Link from "next/link";

const adminNav = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/sources", label: "ソース管理" },
  { href: "/admin/articles", label: "記事管理" },
  { href: "/admin/jobs", label: "ジョブ" },
  { href: "/admin/settings", label: "設定" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* サイドバー */}
      <aside className="w-56 border-r border-gray-200 bg-gray-50 p-4">
        <Link href="/" className="mb-6 block text-lg font-bold text-gray-900">
          aiaiai <span className="text-xs text-gray-400">管理</span>
        </Link>
        <nav className="space-y-1">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
