import { prisma } from "./prisma";
import { MVP_SOURCES } from "../../ingestion/sources/definitions";

let seeded = false;

/**
 * ソース定義をDBに同期（新規追加のみ、既存は変更しない）
 */
async function syncSources(): Promise<void> {
  const existing = await prisma.source.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existing.map((s) => s.slug));

  let added = 0;
  for (const def of MVP_SOURCES) {
    if (existingSlugs.has(def.slug)) continue;
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
    added++;
  }
  if (added > 0) {
    console.log(`[seed] Added ${added} new sources (total: ${MVP_SOURCES.length})`);
  }
}

/**
 * Vercel初回デプロイ時にシードデータを自動作成
 * タグ・ソース・サンプル記事が0件なら一括作成する
 * 既にシード済みでも新規ソースは追加する
 */
export async function ensureSeedData(): Promise<void> {
  if (seeded) return;

  try {
    // 既存DBでも新規ソースは常に同期
    await syncSources();

    const tagCount = await prisma.tag.count();
    if (tagCount > 0) {
      seeded = true;
      return;
    }

    console.log("[seed] No tags found — seeding initial data...");

    // ===== タグ =====
    const tagDefs = [
      // プロダクト軸
      { axis: "PRODUCT" as const, name: "ChatGPT", slug: "chatgpt", sortOrder: 1 },
      { axis: "PRODUCT" as const, name: "OpenAI API", slug: "openai-api", sortOrder: 2 },
      { axis: "PRODUCT" as const, name: "Claude", slug: "claude", sortOrder: 3 },
      { axis: "PRODUCT" as const, name: "Claude Code", slug: "claude-code", sortOrder: 4 },
      { axis: "PRODUCT" as const, name: "Gemini", slug: "gemini", sortOrder: 5 },
      // テーマ軸
      { axis: "THEME" as const, name: "アップデート", slug: "update", sortOrder: 1 },
      { axis: "THEME" as const, name: "料金", slug: "pricing", sortOrder: 2 },
      { axis: "THEME" as const, name: "ポリシー", slug: "policy", sortOrder: 3 },
      { axis: "THEME" as const, name: "使い方", slug: "howto", sortOrder: 4 },
      { axis: "THEME" as const, name: "セキュリティ", slug: "security", sortOrder: 5 },
      // レベル軸
      { axis: "LEVEL" as const, name: "L1: 活用", slug: "l1-usage", sortOrder: 1 },
      { axis: "LEVEL" as const, name: "L2: 定着/自動化", slug: "l2-automation", sortOrder: 2 },
      { axis: "LEVEL" as const, name: "L3: 実装", slug: "l3-implementation", sortOrder: 3 },
      // 実務用途軸
      { axis: "USECASE" as const, name: "経営", slug: "management", sortOrder: 1 },
      { axis: "USECASE" as const, name: "企画", slug: "planning", sortOrder: 2 },
      { axis: "USECASE" as const, name: "開発", slug: "development", sortOrder: 3 },
      { axis: "USECASE" as const, name: "CS", slug: "customer-success", sortOrder: 4 },
      { axis: "USECASE" as const, name: "法務", slug: "legal", sortOrder: 5 },
    ];

    const tags: Record<string, string> = {};
    for (const def of tagDefs) {
      const tag = await prisma.tag.upsert({
        where: { slug: def.slug },
        update: {},
        create: def,
      });
      tags[tag.slug] = tag.id;
    }
    console.log(`[seed] Created ${tagDefs.length} tags`);

    // ===== ソース =====
    for (const def of MVP_SOURCES) {
      await prisma.source.upsert({
        where: { slug: def.slug },
        update: {},
        create: {
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
    }
    console.log(`[seed] Created ${MVP_SOURCES.length} sources`);

    // ===== サンプル記事 =====
    const now = new Date();
    const daysAgo = (d: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      return date;
    };

    const articles = [
      {
        slug: "chatgpt-memory-update-2026-02",
        title: "ChatGPT メモリ機能がアップデート — より長い会話履歴を記憶",
        summary3: "ChatGPTのメモリ機能が強化され、より長期間の会話コンテキストを保持できるようになりました。\nPlus/Teamユーザー向けに先行提供開始。\n出典: OpenAI公式リリースノート",
        summaryLong: "ChatGPTのメモリ機能が大幅にアップデートされ、ユーザーとの会話履歴をより長期間にわたって記憶できるようになりました。",
        whatChanged: "メモリ容量の拡大と記憶精度の向上",
        whoImpacted: "ChatGPT Plus/Teamプランのユーザー",
        actions: "設定からメモリ機能をオンにし、会話の継続性を確認してください。",
        recommendation: "TRY" as const,
        sourceUrl: "https://help.openai.com/ja-jp/articles/6825453-chatgpt-release-notes",
        trustScore: 95, importanceScore: 70, noveltyScore: 75,
        usefulnessScore: 80, urgencyScore: 40, compositeScore: 75.5,
        status: "PUBLISHED" as const,
        publishedAt: daysAgo(3),
        tagSlugs: ["chatgpt", "update", "l1-usage"],
      },
      {
        slug: "claude-code-1-0-release",
        title: "Claude Code 1.0 正式リリース — CLIからのAIコーディング支援が本格化",
        summary3: "Claude Code 1.0が正式リリースされました。\nCLI上でのコード生成・編集・デバッグがより安定し、プロダクション利用に対応。\n出典: Anthropic GitHub Releases",
        summaryLong: "Claude Code 1.0では、ファイル操作・テスト実行・Git連携が改善され、開発ワークフローへの統合がよりスムーズになりました。",
        whatChanged: "安定版1.0リリース、パフォーマンス改善",
        whoImpacted: "エンジニア・開発チーム",
        actions: "npm install -g @anthropic-ai/claude-code でアップデートし、新機能を確認してください。",
        recommendation: "TRY" as const,
        sourceUrl: "https://github.com/anthropics/claude-code/releases",
        trustScore: 90, importanceScore: 85, noveltyScore: 80,
        usefulnessScore: 90, urgencyScore: 50, compositeScore: 81.0,
        status: "PUBLISHED" as const,
        publishedAt: daysAgo(4),
        tagSlugs: ["claude-code", "claude", "update", "l3-implementation", "development"],
      },
      {
        slug: "gemini-2-0-flash-update",
        title: "Gemini 2.0 Flash モデル更新 — 応答速度が30%向上",
        summary3: "Gemini 2.0 Flashモデルがアップデートされ、応答速度が約30%向上しました。\nAPIとアプリ両方で利用可能。\n出典: Google公式アップデートハブ",
        summaryLong: "Gemini 2.0 Flashの最新アップデートでは、推論速度が大幅に改善され、特にリアルタイムアプリケーションでのパフォーマンスが向上しています。",
        whatChanged: "Flashモデルの応答速度30%向上",
        whoImpacted: "Gemini APIユーザー、アプリユーザー",
        actions: "API利用者はモデルバージョンを確認し、パフォーマンステストを実施してください。",
        recommendation: "MONITOR" as const,
        sourceUrl: "https://blog.google/products-and-platforms/products/gemini/",
        trustScore: 95, importanceScore: 65, noveltyScore: 60,
        usefulnessScore: 70, urgencyScore: 30, compositeScore: 67.5,
        status: "PUBLISHED" as const,
        publishedAt: daysAgo(5),
        tagSlugs: ["gemini", "update", "l3-implementation", "development"],
      },
      {
        slug: "openai-api-gpt5-turbo-preview",
        title: "OpenAI API: GPT-5 Turbo プレビュー版がDeveloper向けに提供開始",
        summary3: "GPT-5 Turboのプレビュー版がOpenAI API経由でDeveloperプラン以上で利用可能になりました。\n推論能力の大幅な向上と128Kコンテキストウィンドウが特徴。\n出典: OpenAI Developers changelog",
        summaryLong: null,
        whatChanged: "GPT-5 Turbo プレビュー版の提供開始",
        whoImpacted: "OpenAI APIを利用する開発者",
        actions: "Developerプランでアクセスし、既存プロンプトとの互換性をテストしてください。",
        recommendation: "TRY" as const,
        sourceUrl: "https://developers.openai.com/changelog/",
        trustScore: 95, importanceScore: 90, noveltyScore: 95,
        usefulnessScore: 85, urgencyScore: 60, compositeScore: 86.75,
        status: "PUBLISHED" as const,
        publishedAt: daysAgo(2),
        tagSlugs: ["chatgpt", "openai-api", "update", "l3-implementation", "development"],
      },
    ];

    for (const { tagSlugs, ...data } of articles) {
      const article = await prisma.article.upsert({
        where: { slug: data.slug },
        update: {},
        create: data,
      });
      for (const slug of tagSlugs) {
        if (tags[slug]) {
          await prisma.articleTag.upsert({
            where: { articleId_tagId: { articleId: article.id, tagId: tags[slug] } },
            update: {},
            create: { articleId: article.id, tagId: tags[slug] },
          });
        }
      }
    }
    console.log(`[seed] Created ${articles.length} sample articles`);

    // 監査ログ
    await prisma.auditLog.create({
      data: {
        actor: "system",
        action: "auto-seed",
        target: "Database",
        diff: { message: "Initial seed data auto-created on Vercel" },
      },
    });

    seeded = true;
    console.log("[seed] Auto-seed completed!");
  } catch (e) {
    console.error("[seed] Auto-seed error:", e);
  }
}
