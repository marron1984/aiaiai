import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ===== タグ =====
  const tags = await Promise.all([
    // プロダクト軸
    prisma.tag.upsert({
      where: { slug: "chatgpt" },
      update: {},
      create: { axis: "PRODUCT", name: "ChatGPT", slug: "chatgpt", sortOrder: 1 },
    }),
    prisma.tag.upsert({
      where: { slug: "openai-api" },
      update: {},
      create: { axis: "PRODUCT", name: "OpenAI API", slug: "openai-api", sortOrder: 2 },
    }),
    prisma.tag.upsert({
      where: { slug: "claude" },
      update: {},
      create: { axis: "PRODUCT", name: "Claude", slug: "claude", sortOrder: 3 },
    }),
    prisma.tag.upsert({
      where: { slug: "claude-code" },
      update: {},
      create: { axis: "PRODUCT", name: "Claude Code", slug: "claude-code", sortOrder: 4 },
    }),
    prisma.tag.upsert({
      where: { slug: "gemini" },
      update: {},
      create: { axis: "PRODUCT", name: "Gemini", slug: "gemini", sortOrder: 5 },
    }),
    // テーマ軸
    prisma.tag.upsert({
      where: { slug: "update" },
      update: {},
      create: { axis: "THEME", name: "アップデート", slug: "update", sortOrder: 1 },
    }),
    prisma.tag.upsert({
      where: { slug: "pricing" },
      update: {},
      create: { axis: "THEME", name: "料金", slug: "pricing", sortOrder: 2 },
    }),
    prisma.tag.upsert({
      where: { slug: "policy" },
      update: {},
      create: { axis: "THEME", name: "ポリシー", slug: "policy", sortOrder: 3 },
    }),
    prisma.tag.upsert({
      where: { slug: "howto" },
      update: {},
      create: { axis: "THEME", name: "使い方", slug: "howto", sortOrder: 4 },
    }),
    prisma.tag.upsert({
      where: { slug: "security" },
      update: {},
      create: { axis: "THEME", name: "セキュリティ", slug: "security", sortOrder: 5 },
    }),
    // レベル軸
    prisma.tag.upsert({
      where: { slug: "l1-usage" },
      update: {},
      create: { axis: "LEVEL", name: "L1: 活用", slug: "l1-usage", sortOrder: 1 },
    }),
    prisma.tag.upsert({
      where: { slug: "l2-automation" },
      update: {},
      create: { axis: "LEVEL", name: "L2: 定着/自動化", slug: "l2-automation", sortOrder: 2 },
    }),
    prisma.tag.upsert({
      where: { slug: "l3-implementation" },
      update: {},
      create: { axis: "LEVEL", name: "L3: 実装", slug: "l3-implementation", sortOrder: 3 },
    }),
    // 実務用途軸
    prisma.tag.upsert({
      where: { slug: "management" },
      update: {},
      create: { axis: "USECASE", name: "経営", slug: "management", sortOrder: 1 },
    }),
    prisma.tag.upsert({
      where: { slug: "planning" },
      update: {},
      create: { axis: "USECASE", name: "企画", slug: "planning", sortOrder: 2 },
    }),
    prisma.tag.upsert({
      where: { slug: "development" },
      update: {},
      create: { axis: "USECASE", name: "開発", slug: "development", sortOrder: 3 },
    }),
    prisma.tag.upsert({
      where: { slug: "customer-success" },
      update: {},
      create: { axis: "USECASE", name: "CS", slug: "customer-success", sortOrder: 4 },
    }),
    prisma.tag.upsert({
      where: { slug: "legal" },
      update: {},
      create: { axis: "USECASE", name: "法務", slug: "legal", sortOrder: 5 },
    }),
  ]);

  console.log(`Created ${tags.length} tags`);

  // ===== ソース =====
  const sources = await Promise.all([
    prisma.source.upsert({
      where: { slug: "chatgpt-release-notes-ja" },
      update: {},
      create: {
        name: "ChatGPT リリースノート（日本語）",
        slug: "chatgpt-release-notes-ja",
        type: "OFFICIAL",
        url: "https://help.openai.com/ja-jp/articles/6825453-chatgpt-%E3%83%AA%E3%83%AA%E3%83%BC%E3%82%B9%E3%83%8E%E3%83%BC%E3%83%88",
        frequency: "DAILY",
        trustScore: 95,
        legalNotes: "公式ヘルプページ。要約・引用のみ。全文転載禁止。",
      },
    }),
    prisma.source.upsert({
      where: { slug: "chatgpt-release-notes-en" },
      update: {},
      create: {
        name: "ChatGPT Release Notes (EN)",
        slug: "chatgpt-release-notes-en",
        type: "OFFICIAL",
        url: "https://help.openai.com/en/articles/6825453-chatgpt-release-notes",
        frequency: "DAILY",
        trustScore: 95,
        legalNotes: "公式ヘルプページ。要約・引用のみ。",
      },
    }),
    prisma.source.upsert({
      where: { slug: "openai-developers-changelog" },
      update: {},
      create: {
        name: "OpenAI Developers Changelog",
        slug: "openai-developers-changelog",
        type: "RSS",
        url: "https://developers.openai.com/changelog/",
        feedUrl: "https://developers.openai.com/changelog/rss.xml",
        frequency: "DAILY",
        trustScore: 95,
        legalNotes: "公式Developer changelog。RSS配信あり。",
      },
    }),
    prisma.source.upsert({
      where: { slug: "claude-platform-release-notes" },
      update: {},
      create: {
        name: "Claude Developer Platform Release Notes",
        slug: "claude-platform-release-notes",
        type: "OFFICIAL",
        url: "https://docs.anthropic.com/en/docs/about-claude/models",
        frequency: "DAILY",
        trustScore: 95,
        legalNotes: "公式リリースノート。",
      },
    }),
    prisma.source.upsert({
      where: { slug: "claude-code-github-releases" },
      update: {},
      create: {
        name: "Claude Code GitHub Releases",
        slug: "claude-code-github-releases",
        type: "GITHUB",
        url: "https://github.com/anthropics/claude-code",
        frequency: "DAILY",
        trustScore: 90,
        legalNotes: "GitHub REST API利用。レート制限遵守。",
      },
    }),
    prisma.source.upsert({
      where: { slug: "gemini-app-release-notes-ja" },
      update: {},
      create: {
        name: "Gemini アプリ リリースノート（日本語）",
        slug: "gemini-app-release-notes-ja",
        type: "OFFICIAL",
        url: "https://blog.google/products/gemini/",
        frequency: "DAILY",
        trustScore: 95,
        legalNotes: "公式リリースノート。",
      },
    }),
    prisma.source.upsert({
      where: { slug: "gemini-api-changelog" },
      update: {},
      create: {
        name: "Gemini API Changelog",
        slug: "gemini-api-changelog",
        type: "OFFICIAL",
        url: "https://ai.google.dev/gemini-api/docs/changelog",
        frequency: "DAILY",
        trustScore: 90,
        legalNotes: "公式API changelog。",
      },
    }),
  ]);

  console.log(`Created ${sources.length} sources`);

  // ===== サンプル記事 =====
  const chatgptTag = tags.find((t) => t.slug === "chatgpt")!;
  const claudeTag = tags.find((t) => t.slug === "claude")!;
  const claudeCodeTag = tags.find((t) => t.slug === "claude-code")!;
  const geminiTag = tags.find((t) => t.slug === "gemini")!;
  const updateTag = tags.find((t) => t.slug === "update")!;
  const l1Tag = tags.find((t) => t.slug === "l1-usage")!;
  const l3Tag = tags.find((t) => t.slug === "l3-implementation")!;
  const devTag = tags.find((t) => t.slug === "development")!;

  const sampleArticles = [
    {
      slug: "chatgpt-memory-update-2026-02",
      title: "ChatGPT メモリ機能がアップデート — より長い会話履歴を記憶",
      summary3:
        "ChatGPTのメモリ機能が強化され、より長期間の会話コンテキストを保持できるようになりました。\nPlus/Teamユーザー向けに先行提供開始。\n出典: OpenAI公式リリースノート",
      summaryLong:
        "ChatGPTのメモリ機能が大幅にアップデートされ、ユーザーとの会話履歴をより長期間にわたって記憶できるようになりました。これにより、繰り返しの説明が不要になり、よりパーソナライズされた応答が可能になります。",
      whatChanged: "メモリ容量の拡大と記憶精度の向上",
      whoImpacted: "ChatGPT Plus/Teamプランのユーザー",
      actions:
        "設定からメモリ機能をオンにし、会話の継続性を確認してください。",
      recommendation: "TRY" as const,
      sourceUrl:
        "https://help.openai.com/ja-jp/articles/6825453-chatgpt-%E3%83%AA%E3%83%AA%E3%83%BC%E3%82%B9%E3%83%8E%E3%83%BC%E3%83%88",
      trustScore: 95,
      importanceScore: 70,
      noveltyScore: 75,
      usefulnessScore: 80,
      urgencyScore: 40,
      compositeScore: 75.5,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-25"),
      tags: [chatgptTag.id, updateTag.id, l1Tag.id],
    },
    {
      slug: "claude-code-1-0-release",
      title: "Claude Code 1.0 正式リリース — CLIからのAIコーディング支援が本格化",
      summary3:
        "Claude Code 1.0が正式リリースされました。\nCLI上でのコード生成・編集・デバッグがより安定し、プロダクション利用に対応。\n出典: Anthropic GitHub Releases",
      summaryLong:
        "Claude Code 1.0では、ファイル操作・テスト実行・Git連携が改善され、開発ワークフローへの統合がよりスムーズになりました。",
      whatChanged: "安定版1.0リリース、パフォーマンス改善",
      whoImpacted: "エンジニア・開発チーム",
      actions: "npm install -g @anthropic-ai/claude-code でアップデートし、新機能を確認してください。",
      recommendation: "TRY" as const,
      sourceUrl: "https://github.com/anthropics/claude-code/releases",
      trustScore: 90,
      importanceScore: 85,
      noveltyScore: 80,
      usefulnessScore: 90,
      urgencyScore: 50,
      compositeScore: 81.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-24"),
      tags: [claudeCodeTag.id, claudeTag.id, updateTag.id, l3Tag.id, devTag.id],
    },
    {
      slug: "gemini-2-0-flash-update",
      title: "Gemini 2.0 Flash モデル更新 — 応答速度が30%向上",
      summary3:
        "Gemini 2.0 Flashモデルがアップデートされ、応答速度が約30%向上しました。\nAPIとアプリ両方で利用可能。\n出典: Google公式アップデートハブ",
      summaryLong:
        "Gemini 2.0 Flashの最新アップデートでは、推論速度が大幅に改善され、特にリアルタイムアプリケーションでのパフォーマンスが向上しています。",
      whatChanged: "Flashモデルの応答速度30%向上",
      whoImpacted: "Gemini APIユーザー、アプリユーザー",
      actions: "API利用者はモデルバージョンを確認し、パフォーマンステストを実施してください。",
      recommendation: "MONITOR" as const,
      sourceUrl: "https://blog.google/products-and-platforms/products/gemini/",
      trustScore: 95,
      importanceScore: 65,
      noveltyScore: 60,
      usefulnessScore: 70,
      urgencyScore: 30,
      compositeScore: 67.5,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-23"),
      tags: [geminiTag.id, updateTag.id, l3Tag.id, devTag.id],
    },
    {
      slug: "openai-api-gpt5-turbo-preview",
      title: "OpenAI API: GPT-5 Turbo プレビュー版がDeveloper向けに提供開始",
      summary3:
        "GPT-5 Turboのプレビュー版がOpenAI API経由でDeveloperプラン以上で利用可能になりました。\n推論能力の大幅な向上と128Kコンテキストウィンドウが特徴。\n出典: OpenAI Developers changelog",
      summaryLong: null,
      whatChanged: "GPT-5 Turbo プレビュー版の提供開始",
      whoImpacted: "OpenAI APIを利用する開発者",
      actions: "Developerプランでアクセスし、既存プロンプトとの互換性をテストしてください。",
      recommendation: "TRY" as const,
      sourceUrl: "https://developers.openai.com/changelog/",
      trustScore: 95,
      importanceScore: 90,
      noveltyScore: 95,
      usefulnessScore: 85,
      urgencyScore: 60,
      compositeScore: 86.75,
      status: "DRAFT" as const,
      publishedAt: new Date("2026-02-26"),
      tags: [chatgptTag.id, updateTag.id, l3Tag.id, devTag.id],
    },
  ];

  for (const articleData of sampleArticles) {
    const { tags: tagIds, ...data } = articleData;

    const article = await prisma.article.upsert({
      where: { slug: data.slug },
      update: {},
      create: data,
    });

    // タグ紐付け
    for (const tagId of tagIds) {
      await prisma.articleTag.upsert({
        where: {
          articleId_tagId: { articleId: article.id, tagId },
        },
        update: {},
        create: { articleId: article.id, tagId },
      });
    }
  }

  console.log(`Created ${sampleArticles.length} sample articles`);

  // 監査ログ
  await prisma.auditLog.create({
    data: {
      actor: "system",
      action: "seed",
      target: "Database",
      diff: { message: "Initial seed data created" },
    },
  });

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
