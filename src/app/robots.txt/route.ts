import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${SITE_URL}/api/sitemap
`;

  return new NextResponse(robotsTxt, {
    headers: { "Content-Type": "text/plain" },
  });
}
