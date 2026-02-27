"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

// ===== 記事操作 =====

export async function publishArticle(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.article.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: "article.publish",
      target: "Article",
      targetId: id,
      articleId: id,
    },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/latest");
}

export async function unpublishArticle(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.article.update({
    where: { id },
    data: { status: "UNPUBLISHED" },
  });
  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: "article.unpublish",
      target: "Article",
      targetId: id,
      articleId: id,
    },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/");
}

export async function deleteArticle(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.article.update({
    where: { id },
    data: { status: "DELETED" },
  });
  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: "article.delete",
      target: "Article",
      targetId: id,
      articleId: id,
    },
  });
  revalidatePath("/admin/articles");
}

// ===== ソース操作 =====

export async function createSource(formData: FormData) {
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const type = formData.get("type") as "OFFICIAL" | "RSS" | "GITHUB" | "X";
  const url = formData.get("url") as string;
  const feedUrl = (formData.get("feedUrl") as string) || null;
  const trustScore = parseInt(formData.get("trustScore") as string) || 80;
  const frequency = (formData.get("frequency") as "HOURLY" | "DAILY" | "WEEKLY") || "DAILY";
  const legalNotes = (formData.get("legalNotes") as string) || null;

  await prisma.source.create({
    data: { name, slug, type, url, feedUrl, trustScore, frequency, legalNotes },
  });
  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: "source.create",
      target: "Source",
      diff: JSON.parse(JSON.stringify({ name, slug, type, url })),
    },
  });
  revalidatePath("/admin/sources");
}

export async function toggleSource(formData: FormData) {
  const id = formData.get("id") as string;
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return;

  await prisma.source.update({
    where: { id },
    data: { isActive: !source.isActive },
  });
  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: source.isActive ? "source.deactivate" : "source.activate",
      target: "Source",
      targetId: id,
    },
  });
  revalidatePath("/admin/sources");
}

// ===== 手動収集 =====

export async function triggerManualIngest() {
  const { runDailyJob } = await import("../../ingestion/jobs/daily");
  await runDailyJob();
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/articles");
  revalidatePath("/admin");
}
