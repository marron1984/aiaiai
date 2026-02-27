import { NextRequest, NextResponse } from "next/server";

/**
 * 管理画面の簡易Basic認証
 * ADMIN_PASSWORD環境変数が設定されている場合のみ有効
 */
export function middleware(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return NextResponse.next();

  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [, password] = decoded.split(":");
      if (password === adminPassword) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("認証が必要です", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="aiaiai admin"',
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
