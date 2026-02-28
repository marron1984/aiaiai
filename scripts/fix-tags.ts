const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const avTag = await p.tag.findUnique({ where: { slug: "av" } });
  const osakaTag = await p.tag.findUnique({ where: { slug: "osaka-local" } });

  if (!avTag || !osakaTag) {
    console.log("Tags not found - av:", !!avTag, "osaka-local:", !!osakaTag);
    return;
  }

  const avSlugs = [
    "seto-kanna-2026-flash-ranking-1st",
    "kawagoe-niko-premium-nude-posebook-2026",
    "harukawa-neruru-gravure-debut-2026",
  ];
  for (const slug of avSlugs) {
    const art = await p.article.findUnique({ where: { slug } });
    if (!art) continue;
    const existing = await p.articleTag.findUnique({
      where: { articleId_tagId: { articleId: art.id, tagId: avTag.id } },
    });
    if (!existing) {
      await p.articleTag.create({
        data: { articleId: art.id, tagId: avTag.id },
      });
      console.log("Tagged", slug, "with av");
    }
  }

  const osakaSlugs = [
    "osaka-vietnam-festival-2026-03",
    "sennan-kaki-matsuri-2026",
    "osaka-march-events-2026",
  ];
  for (const slug of osakaSlugs) {
    const art = await p.article.findUnique({ where: { slug } });
    if (!art) continue;
    const existing = await p.articleTag.findUnique({
      where: { articleId_tagId: { articleId: art.id, tagId: osakaTag.id } },
    });
    if (!existing) {
      await p.articleTag.create({
        data: { articleId: art.id, tagId: osakaTag.id },
      });
      console.log("Tagged", slug, "with osaka-local");
    }
  }

  // Verify
  const cats = await p.hubCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { children: true },
  });
  console.log("\n=== Hub Categories ===");
  for (const c of cats) {
    if (c.parentId) continue;
    console.log("  ", c.icon, c.name, "(" + c.slug + ")");
    for (const ch of c.children) {
      console.log("    >", ch.icon, ch.name, "(" + ch.slug + ")");
    }
  }

  const articles = await p.article.findMany({
    where: { status: "PUBLISHED" },
    include: { tags: { include: { tag: true } } },
  });
  const tagCount: Record<string, number> = {};
  for (const a of articles) {
    for (const t of a.tags) {
      tagCount[t.tag.slug] = (tagCount[t.tag.slug] || 0) + 1;
    }
  }
  console.log("\n=== Articles per tag ===");
  for (const k of Object.keys(tagCount).sort()) {
    console.log("  ", k, ":", tagCount[k]);
  }

  await p.$disconnect();
}

main();
