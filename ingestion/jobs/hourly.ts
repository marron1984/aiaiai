import { PrismaClient } from "@prisma/client";
import { fetchRss } from "../fetchers/rss";
import { fetchGitHubReleases } from "../fetchers/github";
import { fetchHtmlPage } from "../fetchers/html";
import { fetchOfficialXPosts, fetchAITopicXPosts } from "../fetchers/x";
import { normalizeUrl } from "../normalize/url";
import { normalizeTitle } from "../normalize/title";
import { deduplicateItems, DedupeCandidate } from "../dedupe/dedup";
import { scoreArticle } from "../score/scoring";
import { generateTemplateSummary } from "../summarize/template";
import { MVP_SOURCES } from "../sources/definitions";
import type { FetchedItem } from "../fetchers/rss";

const prisma = new PrismaClient();

export interface HourlyJobResult {
  sourcesProcessed: number;
  itemsFetched: number;
  articlesCreated: number;
  sourcesSynced: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
}

/**
 * ソース定義をDBに同期
 */
async function syncSourceDefinitions(): Promise<number> {
  let synced = 0;

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
      synced++;
    } else {
      // URL/feedUrl/frequency変更があれば更新
      const updates: Record<string, string | null> = {};
      if (existing.url !== def.url) updates.url = def.url;
      if (existing.feedUrl !== (def.feedUrl || null)) updates.feedUrl = def.feedUrl || null;
      if (existing.frequency !== def.frequency) updates.frequency = def.frequency;
      if (Object.keys(updates).length > 0) {
        await prisma.source.update({
          where: { slug: def.slug },
          data: updates,
        });
      }
    }
  }

  return synced;
}

/**
 * ソースslugからプロダクトタグslugを取得
 */
function getProductTagSlugs(sourceSlug: string): string[] {
  const def = MVP_SOURCES.find((s) => s.slug === sourceSlug);
  return def?.productTagSlugs || [];
}

/**
 * 記事にタグを自動付与
 */
async function autoTagArticle(
  articleId: string,
  sourceSlug: string,
  title: string,
  content?: string
): Promise<void> {
  const tagSlugs = getProductTagSlugs(sourceSlug);
  tagSlugs.push("update");

  const combinedText = `${title} ${content || ""}`.toLowerCase();

  // レベル自動判定
  const l1Keywords = ["活用", "使い方", "入門", "使ってみた", "やってみた", "tips", "ノーコード", "プロンプト", "テンプレート"];
  const l2Keywords = ["自動化", "ワークフロー", "連携", "運用", "効率化", "組織", "導入"];
  const l3Keywords = ["api", "sdk", "実装", "migration", "breaking", "互換性", "セキュリティ"];

  const l1Hits = l1Keywords.filter((kw) => combinedText.includes(kw)).length;
  const l2Hits = l2Keywords.filter((kw) => combinedText.includes(kw)).length;
  const l3Hits = l3Keywords.filter((kw) => combinedText.includes(kw)).length;

  if (l1Hits >= l2Hits && l1Hits >= l3Hits && l1Hits > 0) {
    tagSlugs.push("l1-usage");
  } else if (l2Hits >= l3Hits && l2Hits > 0) {
    tagSlugs.push("l2-automation");
  } else if (l3Hits > 0) {
    tagSlugs.push("l3-implementation");
  }

  const devKeywords = ["api", "sdk", "開発", "実装", "コード", "エンジニア"];
  const planningKeywords = ["企画", "マーケ", "プロンプト", "活用事例", "業務"];
  if (devKeywords.some((kw) => combinedText.includes(kw))) {
    tagSlugs.push("development");
  }
  if (planningKeywords.some((kw) => combinedText.includes(kw))) {
    tagSlugs.push("planning");
  }

  const uniqueSlugs = [...new Set(tagSlugs)];
  for (const slug of uniqueSlugs) {
    const tag = await prisma.tag.findUnique({ where: { slug } });
    if (!tag) continue;

    await prisma.articleTag.upsert({
      where: {
        articleId_tagId: { articleId, tagId: tag.id },
      },
      update: {},
      create: { articleId, tagId: tag.id },
    });
  }
}

/**
 * 毎時収集ジョブ
 * 全ソースを1時間ごとにクロール
 * Sync → Fetch → Parse → Normalize → Dedupe → Summarize → Score → 保存
 */
export async function runHourlyJob(): Promise<HourlyJobResult> {
  const result: HourlyJobResult = {
    sourcesProcessed: 0,
    itemsFetched: 0,
    articlesCreated: 0,
    sourcesSynced: 0,
    errors: [],
    startedAt: new Date().toISOString(),
  };

  // ソース定義をDBに同期
  try {
    result.sourcesSynced = await syncSourceDefinitions();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(`Source sync: ${msg}`);
  }

  // アクティブなソースを取得
  const sources = await prisma.source.findMany({
    where: { isActive: true },
  });

  const allCandidates: DedupeCandidate[] = [];
  const rawItemsMap = new Map<
    string,
    {
      item: FetchedItem;
      sourceId: string;
      sourceType: string;
      sourceName: string;
      sourceSlug: string;
      jobRunId: string;
    }
  >();

  // 各ソースからデータ取得
  for (const source of sources) {
    const jobRun = await prisma.jobRun.create({
      data: {
        sourceId: source.id,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    try {
      let items: FetchedItem[] = [];
      const sourceDef = MVP_SOURCES.find((s) => s.slug === source.slug);

      switch (source.type) {
        case "RSS":
          if (source.feedUrl) {
            items = await fetchRss(source.feedUrl);
          }
          break;
        case "GITHUB":
          items = await fetchGitHubReleases(source.url);
          break;
        case "OFFICIAL":
          items = await fetchHtmlPage(source.url);
          break;
        case "X":
          if (!process.env.X_BEARER_TOKEN) break;
          if (sourceDef?.fetchMethod === "x-search") {
            items = await fetchAITopicXPosts();
          } else {
            const username = source.url.replace(/^https?:\/\/(x\.com|twitter\.com)\//, "");
            items = await fetchOfficialXPosts(username);
          }
          break;
        default:
          break;
      }

      // RawItemとしてDB保存
      for (const item of items) {
        if (!item.url) continue;

        const canonicalUrl = normalizeUrl(item.url);
        const title = normalizeTitle(item.title);

        if (!title || title === "untitled") continue;

        // 既存チェック（URL重複回避）
        const existing = await prisma.rawItem.findUnique({
          where: { canonicalUrl },
        });
        if (existing) continue;

        const rawItem = await prisma.rawItem.create({
          data: {
            sourceId: source.id,
            jobRunId: jobRun.id,
            canonicalUrl,
            title,
            content: item.content?.slice(0, 500),
            publishedAt: item.publishedAt,
          },
        });

        allCandidates.push({
          id: rawItem.id,
          canonicalUrl,
          title,
          sourceType: source.type,
        });

        rawItemsMap.set(rawItem.id, {
          item,
          sourceId: source.id,
          sourceType: source.type,
          sourceName: source.name,
          sourceSlug: source.slug,
          jobRunId: jobRun.id,
        });

        result.itemsFetched++;
      }

      await prisma.jobRun.update({
        where: { id: jobRun.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          itemsFetched: items.length,
        },
      });

      result.sourcesProcessed++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`${source.name}: ${errorMsg}`);

      await prisma.jobRun.update({
        where: { id: jobRun.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          error: errorMsg,
        },
      });
    }
  }

  // 重複統合
  if (allCandidates.length > 0) {
    const dedupeResult = deduplicateItems(allCandidates);

    for (const cluster of dedupeResult.clusters) {
      const representative = cluster[0];
      const meta = rawItemsMap.get(representative.id);
      if (!meta) continue;

      const articleId = await createArticleFromRawItem(
        representative,
        meta,
        cluster.map((c) => c.id)
      );
      if (articleId) {
        await autoTagArticle(articleId, meta.sourceSlug, representative.title, meta.item.content);
        result.articlesCreated++;
      }
    }

    for (const item of dedupeResult.unique) {
      const meta = rawItemsMap.get(item.id);
      if (!meta) continue;

      const articleId = await createArticleFromRawItem(item, meta, [item.id]);
      if (articleId) {
        await autoTagArticle(articleId, meta.sourceSlug, item.title, meta.item.content);
        result.articlesCreated++;
      }
    }
  }

  result.completedAt = new Date().toISOString();

  // 監査ログ
  await prisma.auditLog.create({
    data: {
      actor: "system",
      action: "hourly_job",
      target: "HourlyJob",
      diff: JSON.parse(JSON.stringify(result)),
    },
  });

  return result;
}

async function createArticleFromRawItem(
  candidate: DedupeCandidate,
  meta: {
    item: FetchedItem;
    sourceId: string;
    sourceType: string;
    sourceName: string;
  },
  rawItemIds: string[]
): Promise<string | null> {
  const scores = scoreArticle({
    sourceType: meta.sourceType as "OFFICIAL" | "RSS" | "GITHUB" | "X",
    title: candidate.title,
    content: meta.item.content,
  });

  const summary = generateTemplateSummary({
    title: candidate.title,
    content: meta.item.content,
    sourceType: meta.sourceType,
    sourceName: meta.sourceName,
    url: candidate.canonicalUrl,
  });

  const slug = generateSlug(candidate.title);

  const existingArticle = await prisma.article.findUnique({
    where: { slug },
  });
  if (existingArticle) return null;

  let topicClusterId: string | undefined;
  if (rawItemIds.length > 1) {
    const cluster = await prisma.topicCluster.create({
      data: {
        clusterKey: `cluster-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        representativeRawItemId: rawItemIds[0],
      },
    });

    await prisma.rawItem.updateMany({
      where: { id: { in: rawItemIds } },
      data: { topicClusterId: cluster.id },
    });

    topicClusterId = cluster.id;
  }

  const isXSource = meta.sourceType === "X";

  const article = await prisma.article.create({
    data: {
      slug,
      title: candidate.title,
      summary3: isXSource
        ? `⚡ 速報（未検証）\n${summary.summary3}`
        : summary.summary3,
      summaryLong: summary.summaryLong,
      whatChanged: summary.whatChanged,
      whoImpacted: summary.whoImpacted,
      actions: isXSource
        ? "この情報はSNS速報です。公式発表を確認してから判断してください。"
        : summary.actions,
      recommendation: isXSource ? "MONITOR" as const : scores.recommendation,
      sourceUrl: candidate.canonicalUrl,
      trustScore: scores.trustScore,
      importanceScore: scores.importanceScore,
      noveltyScore: scores.noveltyScore,
      usefulnessScore: scores.usefulnessScore,
      urgencyScore: scores.urgencyScore,
      compositeScore: isXSource
        ? Math.min(scores.compositeScore, 50)
        : scores.compositeScore,
      status: "PUBLISHED",
      publishedAt: meta.item.publishedAt,
      topicClusterId,
    },
  });

  return article.id;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80)
    .replace(/-+$/, "")
    || `article-${Date.now()}`;
}
