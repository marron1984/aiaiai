import Link from "next/link";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="font-bold text-gray-900">{SITE_NAME}</h3>
            <p className="mt-2 text-sm text-gray-600">{SITE_DESCRIPTION}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">コンテンツ</h4>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>
                <Link href="/latest" className="hover:text-gray-900">
                  最新記事
                </Link>
              </li>
              <li>
                <Link href="/daily" className="hover:text-gray-900">
                  今日のダイジェスト
                </Link>
              </li>
              <li>
                <Link href="/weekly" className="hover:text-gray-900">
                  週次ダイジェスト
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-gray-900">
                  比較
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">プロダクト別</h4>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>
                <Link href="/products/chatgpt" className="hover:text-gray-900">
                  ChatGPT
                </Link>
              </li>
              <li>
                <Link href="/products/claude" className="hover:text-gray-900">
                  Claude
                </Link>
              </li>
              <li>
                <Link href="/products/gemini" className="hover:text-gray-900">
                  Gemini
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">管理</h4>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>
                <Link href="/admin" className="hover:text-gray-900">
                  管理画面
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-gray-900">
                  ログイン
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} {SITE_NAME}.
          本サイトは要約主体であり、各出典の著作権は原著作者に帰属します。
        </div>
      </div>
    </footer>
  );
}
