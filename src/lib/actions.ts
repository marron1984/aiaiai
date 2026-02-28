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
  revalidatePath("/admin/sources");
  revalidatePath("/admin");
}

// ===== カテゴリ操作 =====

export async function toggleCategory(formData: FormData) {
  const id = formData.get("id") as string;
  const cat = await prisma.hubCategory.findUnique({ where: { id } });
  if (!cat) return;

  await prisma.hubCategory.update({
    where: { id },
    data: { isActive: !cat.isActive },
  });
  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: cat.isActive ? "category.deactivate" : "category.activate",
      target: "HubCategory",
      targetId: id,
    },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function moveCategoryUp(formData: FormData) {
  const id = formData.get("id") as string;
  const cat = await prisma.hubCategory.findUnique({ where: { id } });
  if (!cat) return;

  const prev = await prisma.hubCategory.findFirst({
    where: { sortOrder: { lt: cat.sortOrder } },
    orderBy: { sortOrder: "desc" },
  });
  if (!prev) return;

  await prisma.$transaction([
    prisma.hubCategory.update({
      where: { id: cat.id },
      data: { sortOrder: prev.sortOrder },
    }),
    prisma.hubCategory.update({
      where: { id: prev.id },
      data: { sortOrder: cat.sortOrder },
    }),
  ]);
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function moveCategoryDown(formData: FormData) {
  const id = formData.get("id") as string;
  const cat = await prisma.hubCategory.findUnique({ where: { id } });
  if (!cat) return;

  const next = await prisma.hubCategory.findFirst({
    where: { sortOrder: { gt: cat.sortOrder } },
    orderBy: { sortOrder: "asc" },
  });
  if (!next) return;

  await prisma.$transaction([
    prisma.hubCategory.update({
      where: { id: cat.id },
      data: { sortOrder: next.sortOrder },
    }),
    prisma.hubCategory.update({
      where: { id: next.id },
      data: { sortOrder: cat.sortOrder },
    }),
  ]);
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function createCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const icon = (formData.get("icon") as string) || "📌";
  const tagSlug = formData.get("tagSlug") as string;
  const description = (formData.get("description") as string) || null;

  const maxOrder = await prisma.hubCategory.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  await prisma.hubCategory.create({
    data: { name, slug, icon, tagSlug, sortOrder, description, isActive: true },
  });
  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: "category.create",
      target: "HubCategory",
      diff: JSON.parse(JSON.stringify({ name, slug, tagSlug })),
    },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function deleteCategory(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.hubCategory.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: "category.delete",
      target: "HubCategory",
      targetId: id,
    },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

// ===== ソース同期 =====

export async function syncSources() {
  const { MVP_SOURCES } = await import("../../ingestion/sources/definitions");

  let created = 0;
  let updated = 0;

  for (const def of MVP_SOURCES) {
    const existing = await prisma.source.findUnique({
      where: { slug: def.slug },
    });

    if (!existing) {
      await prisma.source.create({
        data: {
          name: def.name,
          slug: def.slug,
          type: def.type,
          url: def.url,
          feedUrl: def.feedUrl || null,
          frequency: def.frequency,
          trustScore: def.trustScore,
          legalNotes: def.legalNotes || null,
          isActive: true,
        },
      });
      created++;
    } else if (
      existing.url !== def.url ||
      existing.feedUrl !== (def.feedUrl || null)
    ) {
      await prisma.source.update({
        where: { slug: def.slug },
        data: {
          url: def.url,
          feedUrl: def.feedUrl || null,
        },
      });
      updated++;
    }
  }

  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: "sources.sync",
      target: "Source",
      diff: { created, updated, total: MVP_SOURCES.length },
    },
  });

  revalidatePath("/admin/sources");
}
