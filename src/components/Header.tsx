import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { getSession } from "@/lib/auth";
import { UserMenu } from "./UserMenu";

const navItems = [
  { href: "/latest", label: "最新" },
  { href: "/products/chatgpt", label: "ChatGPT" },
  { href: "/products/claude", label: "Claude" },
  { href: "/products/gemini", label: "Gemini" },
  { href: "/products/poker", label: "ポーカー" },
  { href: "/weekly", label: "週次" },
  { href: "/sources", label: "ソース" },
  { href: "/search", label: "検索" },
];

export async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-gray-900">
          {SITE_NAME}
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {session ? (
            <div className="ml-3 border-l border-gray-200 pl-3">
              <UserMenu
                displayName={session.displayName}
                role={session.role}
              />
            </div>
          ) : (
            <div className="ml-3 border-l border-gray-200 pl-3">
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                ログイン
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
