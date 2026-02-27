import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

const navItems = [
  { href: "/latest", label: "最新" },
  { href: "/products/chatgpt", label: "ChatGPT" },
  { href: "/products/claude", label: "Claude" },
  { href: "/products/gemini", label: "Gemini" },
  { href: "/weekly", label: "週次" },
  { href: "/compare", label: "比較" },
  { href: "/search", label: "検索" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-gray-900">
          {SITE_NAME}
        </Link>
        <nav className="hidden gap-1 md:flex">
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
      </div>
    </header>
  );
}
