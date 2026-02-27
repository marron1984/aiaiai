import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const product = searchParams.get("product");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  if (!q) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const where: Record<string, unknown> = {
    status: "PUBLISHED" as const,
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { summary3: { contains: q, mode: "insensitive" } },
      { summaryLong: { contains: q, mode: "insensitive" } },
    ],
  };

  if (product) {
    where.tags = {
      some: {
        tag: { slug: product, axis: "PRODUCT" },
      },
    };
  }

  const articles = await prisma.article.findMany({
    where,
    orderBy: { compositeScore: "desc" },
    take: limit,
    include: {
      tags: { include: { tag: true } },
    },
  });

  return NextResponse.json({
    query: q,
    count: articles.length,
    articles: articles.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      summary3: a.summary3,
      compositeScore: a.compositeScore,
      recommendation: a.recommendation,
      publishedAt: a.publishedAt,
      sourceUrl: a.sourceUrl,
      tags: a.tags.map((t) => ({
        axis: t.tag.axis,
        name: t.tag.name,
        slug: t.tag.slug,
      })),
    })),
  });
}
