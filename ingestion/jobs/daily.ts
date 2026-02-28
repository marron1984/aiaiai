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

export interface DailyJobResult {
  sourcesProcessed: number;
  itemsFetched: number;
  articlesCreated: number;
  sourcesSynced: number;
  errors: string[];
}

/**
 * ソース定義をDBに同期
 * definitions.ts に定義されたソースが DB に存在しなければ自動登録
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
    } else if (existing.url !== def.url || existing.feedUrl !== (def.feedUrl || null)) {
      // URL変更があれば更新
      await prisma.source.update({
        where: { slug: def.slug },
        data: {
          url: def.url,
          feedUrl: def.feedUrl || null,
        },
      });
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
 * 吉田ペルソナ（Biz実装層 L1-L2）向けレベルタグも自動判定
 */
async function autoTagArticle(
  articleId: string,
  sourceSlug: string,
  title: string,
  content?: string
): Promise<void> {
  const tagSlugs = getProductTagSlugs(sourceSlug);
  // 「アップデート」タグも自動付与
  tagSlugs.push("update");

  // レベル自動判定（吉田ペルソナ向け）
  const combinedText = `${title} ${content || ""}`.toLowerCase();
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

  // 実務用途タグの自動判定
  const devKeywords = ["api", "sdk", "開発", "実装", "コード", "エンジニア"];
  const planningKeywords = ["企画", "マーケ", "プロンプト", "活用事例", "業務"];
  if (devKeywords.some((kw) => combinedText.includes(kw))) {
    tagSlugs.push("development");
  }
  if (planningKeywords.some((kw) => combinedText.includes(kw))) {
    tagSlugs.push("planning");
  }

  // 重複除去してタグ付与
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
 * 日次収集ジョブ
 * Sync → Fetch → Parse → Normalize → Dedupe → Summarize → Score → 保存
 */
export async function runDailyJob(): Promise<DailyJobResult> {
  const result: DailyJobResult = {
    sourcesProcessed: 0,
    itemsFetched: 0,
    articlesCreated: 0,
    sourcesSynced: 0,
    errors: [],
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

      // ソース定義からfetchMethodを取得
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
          // X API v2 経由で取得（スクレイピング禁止）
          if (!process.env.X_BEARER_TOKEN) {
            // トークン未設定時はスキップ（エラーにしない）
            break;
          }
          if (sourceDef?.fetchMethod === "x-search") {
            items = await fetchAITopicXPosts();
          } else {
            // 公式アカウントからの取得
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

        // 空タイトルスキップ
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

    // ユニークアイテムから記事を生成
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
): Promise<string | null> {
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
  if (existingArticle) return null;

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

  // X（SNS速報）は「速報」ラベルで隔離（裏取り前は昇格しない）
  const isXSource = meta.sourceType === "X";
  const articleTitle = isXSource ? candidate.title : candidate.title;
  const articleStatus = isXSource ? "DRAFT" : "PUBLISHED"; // X速報のみDRAFT、それ以外は即公開

  // 記事作成
  const article = await prisma.article.create({
    data: {
      slug,
      title: articleTitle,
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
      status: articleStatus,
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
