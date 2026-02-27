"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const adminNav = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/sources", label: "ソース管理" },
  { href: "/admin/articles", label: "記事管理" },
  { href: "/admin/jobs", label: "ジョブ" },
  { href: "/admin/settings", label: "設定" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* モバイルヘッダー */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-3 md:hidden">
        <Link href="/" className="text-lg font-bold text-gray-900">
          aiaiai <span className="text-xs text-gray-400">管理</span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-200"
          aria-label="メニュー"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* モバイルメニュー（オーバーレイ） */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <nav
            className="absolute left-0 top-0 h-full w-64 bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <Link href="/" className="text-lg font-bold text-gray-900">
                aiaiai <span className="text-xs text-gray-400">管理</span>
              </Link>
            </div>
            <div className="space-y-1">
              {adminNav.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-md px-3 py-2.5 text-sm ${
                      isActive
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}

      {/* デスクトップサイドバー */}
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-gray-50 p-4 md:block">
        <Link href="/" className="mb-6 block text-lg font-bold text-gray-900">
          aiaiai <span className="text-xs text-gray-400">管理</span>
        </Link>
        <nav className="space-y-1">
          {adminNav.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? "bg-blue-50 font-semibold text-blue-700"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
