import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();
  const action = formData.get("action") as string;

  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  let newStatus: "PUBLISHED" | "UNPUBLISHED" | "DELETED" | undefined;

  switch (action) {
    case "publish":
      newStatus = "PUBLISHED";
      break;
    case "unpublish":
      newStatus = "UNPUBLISHED";
      break;
    case "delete":
      newStatus = "DELETED";
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await prisma.article.update({
    where: { id },
    data: {
      status: newStatus,
      publishedAt: newStatus === "PUBLISHED" ? new Date() : article.publishedAt,
    },
  });

  // 監査ログ
  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: `article.${action}`,
      target: "Article",
      targetId: id,
      articleId: id,
    },
  });

  // 管理画面にリダイレクト
  return NextResponse.redirect(new URL("/admin/articles", request.url));
}
