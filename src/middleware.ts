import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "aiaiai_session";

/**
 * Cookie セッション認証ミドルウェア
 * - /login と /api/auth/* はスキップ
 * - /admin/* は ADMIN ロールのみ
 * - それ以外は認証済みユーザーのみ
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 認証不要のパス
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  // セッションCookieを確認
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  if (!sessionCookie?.value) {
    return redirectToLogin(request);
  }

  // セッションをデコード
  try {
    const decoded = Buffer.from(sessionCookie.value, "base64").toString("utf-8");
    const session = JSON.parse(decoded);

    if (!session.userId || !session.username) {
      return redirectToLogin(request);
    }

    // 管理画面はADMINロール必須
    if (pathname.startsWith("/admin")) {
      if (session.role !== "ADMIN") {
        return new NextResponse("管理者権限が必要です", { status: 403 });
      }
    }

    return NextResponse.next();
  } catch {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * 以下を除外:
     * - _next/static, _next/image (静的アセット)
     * - favicon.ico, robots.txt, sitemap.xml
     * - API cron/webhook (サーバー間通信)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|api/cron|api/sitemap).*)",
  ],
};
