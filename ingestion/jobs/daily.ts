import { PrismaClient } from "@prisma/client";
import { fetchRss } from "../fetchers/rss";
import { fetchGitHubReleases } from "../fetchers/github";
import { fetchHtmlPage } from "../fetchers/html";
import { normalizeUrl } from "../normalize/url";
import { normalizeTitle } from "../normalize/title";
import { deduplicateItems, DedupeCandidate } from "../dedupe/dedup";
import { scoreArticle } from "../score/scoring";
import { generateTemplateSummary } from "../summarize/template";
import type { FetchedItem } from "../fetchers/rss";

const prisma = new PrismaClient();

export interface DailyJobResult {
  sourcesProcessed: number;
  itemsFetched: number;
  articlesCreated: number;
  errors: string[];
}

/**
 * 日次収集ジョブ
 * Fetch → Parse → Normalize → Dedupe → Summarize → Score → 保存
 */
export async function runDailyJob(): Promise<DailyJobResult> {
  const result: DailyJobResult = {
    sourcesProcessed: 0,
    itemsFetched: 0,
    articlesCreated: 0,
    errors: [],
  };

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
        default:
          break;
      }

      // RawItemとしてDB保存
      for (const item of items) {
        if (!item.url) continue;

        const canonicalUrl = normalizeUrl(item.url);
        const title = normalizeTitle(item.title);

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
            content: item.content?.slice(0, 500), // 全文転載回避
            publishedAt: item.publishedAt,
          },
        });

        const candidateId = rawItem.id;
        allCandidates.push({
          id: candidateId,
          canonicalUrl,
          title,
          sourceType: source.type,
        });

        rawItemsMap.set(candidateId, {
          item,
          sourceId: source.id,
          sourceType: source.type,
          sourceName: source.name,
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
      const errorMsg =
        error instanceof Error ? error.message : String(error);
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

    // クラスタから記事を生成
    for (const cluster of dedupeResult.clusters) {
      const representative = cluster[0]; // 代表（最高優先度）
      const meta = rawItemsMap.get(representative.id);
      if (!meta) continue;

      await createArticleFromRawItem(
        representative,
        meta,
        cluster.map((c) => c.id)
      );
      result.articlesCreated++;
    }

    // ユニークアイテムから記事を生成
    for (const item of dedupeResult.unique) {
      const meta = rawItemsMap.get(item.id);
      if (!meta) continue;

      await createArticleFromRawItem(item, meta, [item.id]);
      result.articlesCreated++;
    }
  }

  // 監査ログ
  await prisma.auditLog.create({
    data: {
      actor: "system",
      action: "daily_job",
      target: "DailyJob",
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
) {
  // スコアリング
  const scores = scoreArticle({
    sourceType: meta.sourceType as "OFFICIAL" | "RSS" | "GITHUB" | "X",
    title: candidate.title,
    content: meta.item.content,
  });

  // 要約生成
  const summary = generateTemplateSummary({
    title: candidate.title,
    content: meta.item.content,
    sourceType: meta.sourceType,
    sourceName: meta.sourceName,
    url: candidate.canonicalUrl,
  });

  // slug生成
  const slug = generateSlug(candidate.title);

  // 既存記事チェック
  const existingArticle = await prisma.article.findUnique({
    where: { slug },
  });
  if (existingArticle) return;

  // TopicCluster作成
  let topicClusterId: string | undefined;
  if (rawItemIds.length > 1) {
    const cluster = await prisma.topicCluster.create({
      data: {
        clusterKey: `cluster-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        representativeRawItemId: rawItemIds[0],
      },
    });

    // RawItemをクラスタに紐付け
    await prisma.rawItem.updateMany({
      where: { id: { in: rawItemIds } },
      data: { topicClusterId: cluster.id },
    });

    topicClusterId = cluster.id;
  }

  // 記事作成（下書き状態）
  await prisma.article.create({
    data: {
      slug,
      title: candidate.title,
      summary3: summary.summary3,
      summaryLong: summary.summaryLong,
      whatChanged: summary.whatChanged,
      whoImpacted: summary.whoImpacted,
      actions: summary.actions,
      recommendation: scores.recommendation,
      sourceUrl: candidate.canonicalUrl,
      trustScore: scores.trustScore,
      importanceScore: scores.importanceScore,
      noveltyScore: scores.noveltyScore,
      usefulnessScore: scores.usefulnessScore,
      urgencyScore: scores.urgencyScore,
      compositeScore: scores.compositeScore,
      status: "DRAFT", // 管理者承認待ち
      publishedAt: meta.item.publishedAt,
      topicClusterId,
    },
  });
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
