import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  const productTags = await prisma.tag.findMany({
    where: { axis: "PRODUCT" },
    select: { slug: true },
  });

  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/latest", priority: "0.9", changefreq: "daily" },
    { url: "/search", priority: "0.7", changefreq: "weekly" },
    { url: "/compare", priority: "0.7", changefreq: "weekly" },
    { url: "/weekly", priority: "0.8", changefreq: "weekly" },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (p) => `  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join("\n")}
${productTags
  .map(
    (t) => `  <url>
    <loc>${SITE_URL}/products/${t.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join("\n")}
${articles
  .map(
    (a) => `  <url>
    <loc>${SITE_URL}/article/${a.slug}</loc>
    <lastmod>${a.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
