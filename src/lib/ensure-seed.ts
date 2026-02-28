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
 * 最新記事を同期（既存DBにもslugが存在しない記事を追加）
 */
async function syncLatestArticles(): Promise<void> {
  const existingArticles = await prisma.article.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existingArticles.map((a) => a.slug));

  const allTags = await prisma.tag.findMany();
  const tagMap: Record<string, string> = {};
  for (const t of allTags) {
    tagMap[t.slug] = t.id;
  }
  if (Object.keys(tagMap).length === 0) return;

  const latestArticles = getLatestArticleDefs();
  let added = 0;

  for (const { tagSlugs, ...data } of latestArticles) {
    if (existingSlugs.has(data.slug)) continue;
    const article = await prisma.article.create({ data });
    for (const slug of tagSlugs) {
      if (tagMap[slug]) {
        await prisma.articleTag.create({
          data: { articleId: article.id, tagId: tagMap[slug] },
        });
      }
    }
    added++;
  }
  if (added > 0) {
    console.log(`[seed] Added ${added} latest articles`);
  }
}

/**
 * 不足しているタグを同期（新規タグのみ追加）
 */
async function syncTags(): Promise<void> {
  const existing = await prisma.tag.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existing.map((t) => t.slug));

  const tagDefs = [
    { axis: "PRODUCT" as const, name: "AV", slug: "av", sortOrder: 7 },
    { axis: "PRODUCT" as const, name: "大阪ローカル", slug: "osaka-local", sortOrder: 8 },
    { axis: "PRODUCT" as const, name: "起業", slug: "startup", sortOrder: 9 },
    { axis: "PRODUCT" as const, name: "ウズベキスタン", slug: "uzbekistan", sortOrder: 10 },
    { axis: "PRODUCT" as const, name: "ホテル", slug: "hotel", sortOrder: 11 },
    { axis: "PRODUCT" as const, name: "香水", slug: "perfume", sortOrder: 12 },
    { axis: "PRODUCT" as const, name: "ガジェット", slug: "gadget", sortOrder: 13 },
    { axis: "PRODUCT" as const, name: "大阪風俗", slug: "osaka-fuzoku", sortOrder: 14 },
    { axis: "PRODUCT" as const, name: "大阪ポーカー", slug: "osaka-poker", sortOrder: 15 },
    { axis: "PRODUCT" as const, name: "大阪撮影会・握手会", slug: "osaka-av-event", sortOrder: 16 },
    { axis: "PRODUCT" as const, name: "ミナミ", slug: "minami", sortOrder: 17 },
  ];

  let added = 0;
  for (const def of tagDefs) {
    if (existingSlugs.has(def.slug)) continue;
    await prisma.tag.create({ data: def });
    added++;
  }
  if (added > 0) {
    console.log(`[seed] Added ${added} new tags`);
  }
}

/**
 * ハブカテゴリを同期（存在しないカテゴリを追加、階層対応）
 */
async function syncHubCategories(): Promise<void> {
  const existing = await prisma.hubCategory.findMany({ select: { slug: true, id: true } });
  const existingSlugs = new Set(existing.map((c) => c.slug));
  const slugToId: Record<string, string> = {};
  for (const c of existing) {
    slugToId[c.slug] = c.id;
  }

  // トップレベルカテゴリ
  const topCategories = [
    { name: "AI全般", slug: "ai", icon: "🤖", tagSlug: "chatgpt", sortOrder: 1, description: "ChatGPT・Claude・Gemini等のAI最新情報" },
    { name: "ポーカー", slug: "poker", icon: "🃏", tagSlug: "poker", sortOrder: 2, description: "WSOP・JOPT・WPT等の大会・戦略情報" },
    { name: "AV", slug: "av", icon: "🎬", tagSlug: "av", sortOrder: 3, description: "新人・リリース・業界ニュース" },
    { name: "大阪ローカル", slug: "osaka", icon: "🏯", tagSlug: "osaka-local", sortOrder: 4, description: "大阪のイベント・グルメ・生活情報" },
    { name: "起業", slug: "startup", icon: "🚀", tagSlug: "startup", sortOrder: 5, description: "起業・スタートアップ・ビジネス戦略" },
    { name: "ウズベキスタン", slug: "uzbekistan", icon: "🇺🇿", tagSlug: "uzbekistan", sortOrder: 6, description: "ウズベキスタンの文化・旅行・ビジネス情報" },
    { name: "ホテル", slug: "hotel", icon: "🏨", tagSlug: "hotel", sortOrder: 7, description: "ホテルマネジメント・宿泊業界情報" },
    { name: "香水", slug: "perfume", icon: "🧴", tagSlug: "perfume", sortOrder: 8, description: "フレグランス・新作・レビュー" },
    { name: "ガジェット", slug: "gadget", icon: "📱", tagSlug: "gadget", sortOrder: 9, description: "最新ガジェット・テクノロジー・レビュー" },
    { name: "大阪風俗", slug: "osaka-fuzoku", icon: "🌙", tagSlug: "osaka-fuzoku", sortOrder: 10, description: "大阪の風俗情報" },
  ];

  let added = 0;
  for (const cat of topCategories) {
    if (existingSlugs.has(cat.slug)) continue;
    const created = await prisma.hubCategory.create({ data: cat });
    slugToId[cat.slug] = created.id;
    existingSlugs.add(cat.slug);
    added++;
  }

  // サブカテゴリ（親ID参照）
  const subCategories = [
    { name: "大阪ポーカー", slug: "osaka-poker", icon: "🃏", tagSlug: "osaka-poker", sortOrder: 1, description: "大阪のポーカー大会・アミューズメント情報", parentSlug: "poker" },
    { name: "大阪撮影会・握手会", slug: "osaka-av-event", icon: "📸", tagSlug: "osaka-av-event", sortOrder: 1, description: "大阪開催の撮影会・握手会・イベント情報", parentSlug: "av" },
    { name: "ミナミ", slug: "minami", icon: "🌃", tagSlug: "minami", sortOrder: 1, description: "ミナミエリアの風俗情報", parentSlug: "osaka-fuzoku" },
  ];

  for (const { parentSlug, ...sub } of subCategories) {
    if (existingSlugs.has(sub.slug)) continue;
    const parentId = slugToId[parentSlug];
    if (!parentId) continue;
    await prisma.hubCategory.create({ data: { ...sub, parentId } });
    added++;
  }

  if (added > 0) {
    console.log(`[seed] Added ${added} hub categories`);
  }
}

/**
 * Vercel初回デプロイ時にシードデータを自動作成
 * タグ・ソース・サンプル記事が0件なら一括作成する
 * 既にシード済みでも新規ソース・新規記事は追加する
 */
export async function ensureSeedData(): Promise<void> {
  if (seeded) return;

  try {
    // 既存DBでも新規タグ・ソース・記事・カテゴリは常に同期
    await syncTags();
    await syncSources();
    await syncLatestArticles();
    await syncHubCategories();

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
      { axis: "PRODUCT" as const, name: "ポーカー", slug: "poker", sortOrder: 6 },
      { axis: "PRODUCT" as const, name: "AV", slug: "av", sortOrder: 7 },
      { axis: "PRODUCT" as const, name: "大阪ローカル", slug: "osaka-local", sortOrder: 8 },
      { axis: "PRODUCT" as const, name: "起業", slug: "startup", sortOrder: 9 },
      { axis: "PRODUCT" as const, name: "ウズベキスタン", slug: "uzbekistan", sortOrder: 10 },
      { axis: "PRODUCT" as const, name: "ホテル", slug: "hotel", sortOrder: 11 },
      { axis: "PRODUCT" as const, name: "香水", slug: "perfume", sortOrder: 12 },
      { axis: "PRODUCT" as const, name: "ガジェット", slug: "gadget", sortOrder: 13 },
      { axis: "PRODUCT" as const, name: "大阪風俗", slug: "osaka-fuzoku", sortOrder: 14 },
      { axis: "PRODUCT" as const, name: "大阪ポーカー", slug: "osaka-poker", sortOrder: 15 },
      { axis: "PRODUCT" as const, name: "大阪撮影会・握手会", slug: "osaka-av-event", sortOrder: 16 },
      { axis: "PRODUCT" as const, name: "ミナミ", slug: "minami", sortOrder: 17 },
      // テーマ軸
      { axis: "THEME" as const, name: "アップデート", slug: "update", sortOrder: 1 },
      { axis: "THEME" as const, name: "料金", slug: "pricing", sortOrder: 2 },
      { axis: "THEME" as const, name: "ポリシー", slug: "policy", sortOrder: 3 },
      { axis: "THEME" as const, name: "使い方", slug: "howto", sortOrder: 4 },
      { axis: "THEME" as const, name: "セキュリティ", slug: "security", sortOrder: 5 },
      { axis: "THEME" as const, name: "大会", slug: "tournament", sortOrder: 6 },
      { axis: "THEME" as const, name: "戦略", slug: "strategy", sortOrder: 7 },
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
        depth: "BREAKING" as const,
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
        depth: "DETAILED" as const,
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
        depth: "DETAILED" as const,
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
        depth: "DEEP" as const,
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

/**
 * 最新記事データ定義（2026年2月末時点）
 */
function getLatestArticleDefs() {
  return [
    // === OpenAI / ChatGPT ===
    {
      slug: "chatgpt-agent-operator-evolution-2026-02",
      title: "ChatGPT Agent登場 — OperatorがChatGPTに統合されエージェント機能が本格化",
      summary3: "OpenAIがOperatorを進化させ「ChatGPT Agent」として統合しました。\nPro→Plus→Teamの順でロールアウト中。繰り返し作業への粘り強さも向上。\n出典: OpenAI公式発表",
      summaryLong: "ChatGPT AgentはOperatorの進化版で、メール処理やフォーム入力など繰り返しの多いタスクを自律的に実行します。「怠け」問題が改善され、数百件のメールからアクションアイテムを抽出するような退屈なタスクにも粘り強く取り組むようになりました。",
      whatChanged: "Operatorが「ChatGPT Agent」に統合・進化。反復タスクへの持続性が向上",
      whoImpacted: "ChatGPT Pro/Plus/Teamユーザー",
      actions: "Pro/Plusプランでエージェント機能を有効にし、メール処理やデータ入力タスクで試してみてください。",
      recommendation: "TRY" as const,
      depth: "DEEP" as const,
      sourceUrl: "https://help.openai.com/en/articles/6825453-chatgpt-release-notes",
      trustScore: 95, importanceScore: 90, noveltyScore: 90,
      usefulnessScore: 85, urgencyScore: 55, compositeScore: 85.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-26"),
      tagSlugs: ["chatgpt", "update", "l1-usage", "l2-automation"],
    },
    {
      slug: "openai-gpt4o-retirement-gpt52-2026-02",
      title: "GPT-4o/GPT-4.1/o4-mini引退 — ChatGPTはGPT-5.2がデフォルトに",
      summary3: "2月13日よりGPT-4o、GPT-4.1、GPT-4.1 mini、o4-miniがChatGPTから引退しました。\n全ユーザーのデフォルトがGPT-5.2に。APIでは引き続き利用可能。\n出典: OpenAI公式発表",
      summaryLong: "OpenAIは旧世代モデルの引退を進め、ChatGPTのデフォルトモデルをGPT-5.2に移行しました。ユーザーの99.9%が既にGPT-5.2を利用しています。APIでは引き続き旧モデルも利用可能です。",
      whatChanged: "GPT-4o等のChatGPTからの引退、GPT-5.2がデフォルトに",
      whoImpacted: "全ChatGPTユーザー、APIユーザー（移行計画が必要）",
      actions: "GPT-4oベースのプロンプトやワークフローがある場合、GPT-5.2での動作を確認してください。",
      recommendation: "TRY" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://openai.com/index/retiring-gpt-4o-and-older-models/",
      trustScore: 95, importanceScore: 95, noveltyScore: 80,
      usefulnessScore: 90, urgencyScore: 85, compositeScore: 90.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-13"),
      tagSlugs: ["chatgpt", "openai-api", "update", "l3-implementation", "development"],
    },
    {
      slug: "chatgpt-deep-research-upgrade-2026-02",
      title: "ChatGPT Deep Research強化 — 研究計画の事前編集と特定サイト指定が可能に",
      summary3: "Deep Research機能が大幅に強化されました。\n特定サイトでの集中調査、研究計画の事前編集、進捗のリアルタイム追跡が可能に。\n出典: OpenAI公式リリースノート",
      summaryLong: "ChatGPTのDeep Research機能がアップグレードされ、信頼できるソースとして特定のWebサイトや接続済みアプリを指定できるようになりました。研究計画を事前に作成・編集し、実行中も方向性を調整可能です。Plus/Proユーザーから順次提供中。",
      whatChanged: "研究計画の事前編集、ソースサイト指定、進捗追跡機能の追加",
      whoImpacted: "ChatGPT Plus/Proユーザー、リサーチ業務に従事する方",
      actions: "Deep Researchを使い、信頼できるソースを指定して業界レポートを作成してみてください。",
      recommendation: "TRY" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://help.openai.com/en/articles/6825453-chatgpt-release-notes",
      trustScore: 95, importanceScore: 75, noveltyScore: 80,
      usefulnessScore: 85, urgencyScore: 35, compositeScore: 76.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-24"),
      tagSlugs: ["chatgpt", "update", "l1-usage", "planning"],
    },
    {
      slug: "chatgpt-context-256k-2026-02",
      title: "ChatGPTのコンテキストウィンドウが256Kトークンに拡大",
      summary3: "Thinking手動選択時のコンテキストウィンドウが256K（入力128K＋出力128K）に拡大しました。\n従来の196Kから約30%増加。\n出典: OpenAI公式リリースノート",
      summaryLong: null,
      whatChanged: "コンテキストウィンドウが196K→256Kトークンに拡大",
      whoImpacted: "長文処理を行うChatGPTユーザー",
      actions: "長いドキュメントの分析や複雑な推論タスクで活用してみてください。",
      recommendation: "MONITOR" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://help.openai.com/en/articles/6825453-chatgpt-release-notes",
      trustScore: 95, importanceScore: 60, noveltyScore: 55,
      usefulnessScore: 70, urgencyScore: 20, compositeScore: 62.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-20"),
      tagSlugs: ["chatgpt", "update", "l1-usage"],
    },
    {
      slug: "openai-110b-fundraise-2026-02",
      title: "OpenAI、$110B（約16兆円）の資金調達 — 評価額$730Bに",
      summary3: "OpenAIが$110Bの資金調達を発表。Amazon $50B、NVIDIA $30B、SoftBank $30Bが参加。\n週間アクティブユーザー9億人超、有料会員5000万人超。\n出典: 各種報道",
      summaryLong: "OpenAIは史上最大級の資金調達ラウンドを発表しました。プレマネー評価額$730B（約110兆円）で、Amazon、NVIDIA、SoftBankが主要投資家です。ChatGPTは週間9億人以上のアクティブユーザーを抱え、有料会員は5000万人を超えています。",
      whatChanged: "$110Bの資金調達、評価額$730B",
      whoImpacted: "AI業界全体、投資家、OpenAI API利用企業",
      actions: "OpenAIのAPI戦略やプラン変更に注目。長期的なプラットフォーム選定の参考に。",
      recommendation: "MONITOR" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://nairametrics.com/2026/02/27/chatgpt-maker-openai-raises-110-billion-at-730-billion-valuation/",
      trustScore: 85, importanceScore: 85, noveltyScore: 70,
      usefulnessScore: 60, urgencyScore: 20, compositeScore: 70.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-27"),
      tagSlugs: ["chatgpt", "openai-api", "pricing", "management"],
    },
    // === Anthropic / Claude ===
    {
      slug: "claude-sonnet-opus-46-release-2026-02",
      title: "Claude Sonnet 4.6 / Opus 4.6リリース — コーディング・長文推論が大幅強化",
      summary3: "Anthropicが最新モデルClaude Sonnet 4.6とOpus 4.6をリリースしました。\nOSWorldスコアが72.5%に到達し人間レベルに接近。1Mトークンコンテキスト（β）対応。\n出典: Anthropic公式発表",
      summaryLong: "Claude Sonnet 4.6はコーディング、コンピュータ操作、長文推論、エージェント計画、ナレッジワーク、デザインの全スキルが向上した最も高性能なSonnetモデルです。Opus 4.6も同時にアップグレードされ、両モデルとも1Mトークンのコンテキストウィンドウがベータで利用可能です。",
      whatChanged: "Sonnet 4.6 / Opus 4.6リリース、1Mコンテキスト（β）、OSWorldで72.5%達成",
      whoImpacted: "Claude APIユーザー、Claude Code利用者、開発者全般",
      actions: "APIのモデルIDを更新し、新モデルでのパフォーマンスを検証してください。",
      recommendation: "TRY" as const,
      depth: "DEEP" as const,
      sourceUrl: "https://platform.claude.com/docs/en/release-notes/overview",
      trustScore: 95, importanceScore: 95, noveltyScore: 95,
      usefulnessScore: 90, urgencyScore: 60, compositeScore: 90.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-25"),
      tagSlugs: ["claude", "update", "l3-implementation", "development"],
    },
    {
      slug: "claude-cowork-desktop-agent-2026-02",
      title: "Claude Cowork登場 — デスクトップアプリでエージェント機能がコーディング以外にも拡大",
      summary3: "Claude DesktopにCowork機能が追加されました。\nローカルVM上でファイル操作やMCP連携を実行。繰り返しタスクのスケジュール実行にも対応。\n出典: Anthropic公式発表",
      summaryLong: "CoworkはClaude Codeのエージェント機能をデスクトップアプリに拡張したもので、コーディング以外のナレッジワークにも対応します。隔離されたVM上でローカルファイルへのアクセスとMCP連携が可能で、定期・オンデマンドのタスクスケジュールにも対応します。現在Proプラン、macOS限定です。",
      whatChanged: "Cowork機能の追加（デスクトップエージェント）、タスクスケジュール対応",
      whoImpacted: "Claude Proプランユーザー（macOS）",
      actions: "Claude Desktopを最新版にアップデートし、Cowork機能で定型業務の自動化を試してみてください。",
      recommendation: "TRY" as const,
      depth: "DEEP" as const,
      sourceUrl: "https://www.anthropic.com/news",
      trustScore: 95, importanceScore: 85, noveltyScore: 90,
      usefulnessScore: 85, urgencyScore: 45, compositeScore: 82.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-24"),
      tagSlugs: ["claude", "update", "l2-automation", "planning"],
    },
    {
      slug: "claude-code-updates-feb-2026",
      title: "Claude Code更新 — メモリ自動保存、/copyピッカー、マルチエージェント改善",
      summary3: "Claude Codeが複数の機能改善を実施しました。\nメモリの自動保存、コードブロックの/copyピッカー、マルチエージェント時のメモリ処理改善。\nTeamプラン全席にClaude Codeアクセスが含まれるように。\n出典: Claude Code GitHub Releases",
      summaryLong: "Claude Codeの最新アップデートでは、メモリの自動保存機能、コードブロック用の/copyピッカー、サブコマンドごとのbashプレフィックスのスマート化、マルチエージェントでのメモリハンドリング改善が含まれます。/mcp reconnectのフリーズ問題やメモリリークの修正も行われました。",
      whatChanged: "メモリ自動保存、/copyピッカー、バグ修正、Teamプラン全席対応",
      whoImpacted: "Claude Code利用者、Teamプラン管理者",
      actions: "claude-codeを最新版にアップデートし、メモリ自動保存機能を確認してください。",
      recommendation: "TRY" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://github.com/anthropics/claude-code/releases",
      trustScore: 90, importanceScore: 75, noveltyScore: 70,
      usefulnessScore: 85, urgencyScore: 40, compositeScore: 75.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-27"),
      tagSlugs: ["claude-code", "claude", "update", "l3-implementation", "development"],
    },
    {
      slug: "anthropic-vercept-acquisition-2026-02",
      title: "AnthropicがVerceptを買収 — コンピュータ操作AIの強化へ",
      summary3: "Anthropicが複雑なタスク完了に特化したAI企業Verceptを買収しました。\n知覚・インタラクション技術でコンピュータ操作能力の強化を目指します。\n出典: Anthropic公式発表",
      summaryLong: "VerceptはAIを使った複雑なタスク完了のための知覚とインタラクション問題の解決に取り組んでいた企業です。買収によりVerceptの外部プロダクトは終了し、チームはAnthropicに合流してコンピュータ操作のフロンティア開拓に取り組みます。",
      whatChanged: "Vercept買収、コンピュータ操作AI強化",
      whoImpacted: "Claude API利用者（将来的にコンピュータ操作機能が強化される見込み）",
      actions: "コンピュータ操作機能のロードマップに注目してください。",
      recommendation: "MONITOR" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://www.anthropic.com/news",
      trustScore: 95, importanceScore: 70, noveltyScore: 75,
      usefulnessScore: 55, urgencyScore: 15, compositeScore: 62.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-22"),
      tagSlugs: ["claude", "update", "management"],
    },
    {
      slug: "claude-office-plugin-marketplace-2026-02",
      title: "Claude、PowerPointアドインとプラグインマーケットプレイスを公開",
      summary3: "ClaudeがPowerPointアドインとして利用可能に。Excelアドインも Opus 4.6にアップグレード。\nTeam/Enterprise向けにプラグインマーケットプレイスと管理者コントロールも追加。\n出典: Anthropic公式発表",
      summaryLong: null,
      whatChanged: "PowerPointアドイン公開、Excel Opus 4.6対応、プラグインマーケットプレイス公開",
      whoImpacted: "Team/Enterpriseプランの管理者・利用者、Microsoft Office利用者",
      actions: "Office連携が必要な場合、PowerPointアドインのインストールを検討してください。",
      recommendation: "TRY" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://www.cnn.com/2026/02/24/tech/anthropic-claude-plugins-office-jobs",
      trustScore: 85, importanceScore: 75, noveltyScore: 80,
      usefulnessScore: 80, urgencyScore: 30, compositeScore: 73.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-24"),
      tagSlugs: ["claude", "update", "l1-usage", "l2-automation"],
    },
    {
      slug: "anthropic-30b-series-g-2026-02",
      title: "Anthropic、$30B（約4.5兆円）のシリーズG資金調達 — 評価額$380Bに",
      summary3: "AnthropicがGICとCoatue主導で$30Bのシリーズ G資金調達を実施しました。\nポストマネー評価額は$380B。\n出典: 各種報道",
      summaryLong: null,
      whatChanged: "$30BのシリーズG資金調達、評価額$380B",
      whoImpacted: "AI業界全体、投資家、Claude APIユーザー",
      actions: "Anthropicのプラットフォーム強化とプラン変更に注目。",
      recommendation: "MONITOR" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://blog.mean.ceo/anthropic-calude-news-february-2026/",
      trustScore: 85, importanceScore: 80, noveltyScore: 65,
      usefulnessScore: 55, urgencyScore: 15, compositeScore: 65.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-26"),
      tagSlugs: ["claude", "pricing", "management"],
    },
    // === Google / Gemini ===
    {
      slug: "gemini-31-pro-deep-think-2026-02",
      title: "Gemini 3.1 Pro & Deep Thinkリリース — 推論性能が3.0 Proの2倍以上に",
      summary3: "GoogleがGemini 3.1 Proをリリース。推論性能が3.0 Proの2倍以上に向上。\nDeep Thinkモードは科学・工学向けの特化推論機能（AI Ultra限定）。\n出典: Google公式ブログ",
      summaryLong: "Gemini 3.1は複雑な問題解決のための知能が大幅に向上したモデルです。3.1 Proは要求の高いワークフロー向けで、Deep ThinkはAI Ultraサブスクライバー限定の科学・工学特化推論モードです。推論性能は3.0 Proの2倍以上と発表されています。",
      whatChanged: "Gemini 3.1 Proリリース、Deep Think推論モード追加",
      whoImpacted: "Gemini API利用者、AI Ultra/Proサブスクライバー",
      actions: "Gemini APIでモデルを3.1 Proに切り替え、既存タスクでの性能改善を確認してください。",
      recommendation: "TRY" as const,
      depth: "DEEP" as const,
      sourceUrl: "https://blog.google/innovation-and-ai/products/gemini-app/gemini-drop-february-2026/",
      trustScore: 95, importanceScore: 90, noveltyScore: 90,
      usefulnessScore: 85, urgencyScore: 50, compositeScore: 85.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-27"),
      tagSlugs: ["gemini", "update", "l3-implementation", "development"],
    },
    {
      slug: "gemini-lyria3-music-nano-banana2-2026-02",
      title: "Gemini February Drop — Lyria 3音楽生成とNano Banana 2画像生成が登場",
      summary3: "Googleの2月Gemini Dropで5つの新機能が発表されました。\nLyria 3でテキスト/画像から30秒の楽曲生成、Nano Banana 2で高精度画像生成が可能に。\n出典: Google公式ブログ",
      summaryLong: "GoogleのGemini Dropでは、Lyria 3による30秒の音楽トラック生成（テキスト/画像入力対応）、Nano Banana 2による高精度画像生成（任意言語のテキスト挿入対応）、Veo 3.1テンプレートによるビデオ作成、検証済み科学的引用機能が発表されました。",
      whatChanged: "Lyria 3音楽生成、Nano Banana 2画像生成、Veo 3.1テンプレート、科学的引用機能",
      whoImpacted: "Geminiアプリユーザー、クリエイター",
      actions: "Geminiアプリで音楽生成・画像生成の新機能を試してみてください。",
      recommendation: "TRY" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://blog.google/innovation-and-ai/products/gemini-app/gemini-drop-february-2026/",
      trustScore: 95, importanceScore: 75, noveltyScore: 85,
      usefulnessScore: 70, urgencyScore: 25, compositeScore: 72.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-27"),
      tagSlugs: ["gemini", "update", "l1-usage"],
    },
    {
      slug: "gemini-chrome-android-auto-2026-02",
      title: "Gemini in Chrome＆Android Auto — ブラウザとカーナビにAIアシスタント統合",
      summary3: "ChromeにGemini 3ベースのサイドパネルが追加。マルチタスク支援とauto browseプレビューが利用可能に。\nAndroid AutoでもGeminiが利用可能になり、自然な会話でタスク実行が可能。\n出典: Google公式発表",
      summaryLong: null,
      whatChanged: "Chrome用Geminiサイドパネル、Android Auto Gemini統合、auto browseプレビュー",
      whoImpacted: "Chromeユーザー、Android Autoユーザー",
      actions: "Chromeを最新版にアップデートし、Geminiサイドパネルを有効にしてみてください。",
      recommendation: "TRY" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://blog.google/innovation-and-ai/products/gemini-app/gemini-drop-february-2026/",
      trustScore: 95, importanceScore: 70, noveltyScore: 75,
      usefulnessScore: 75, urgencyScore: 25, compositeScore: 68.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-25"),
      tagSlugs: ["gemini", "update", "l1-usage"],
    },
    {
      slug: "gemini-student-free-2026-02",
      title: "Gemini、日本を含む4カ国で学生に無料アップグレード提供（2026年7月まで）",
      summary3: "Googleがインドネシア、日本、英国、ブラジルの18歳以上の学生にGemini無料アップグレードを提供。\n2026年7月まで利用可能。\n出典: 9to5Google",
      summaryLong: null,
      whatChanged: "日本を含む4カ国で学生向け無料アップグレード",
      whoImpacted: "18歳以上の学生（日本、インドネシア、英国、ブラジル）",
      actions: "対象の学生は無料アップグレードに申し込んでください。",
      recommendation: "TRY" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://9to5google.com/2026/02/21/google-ai-pro-ultra-features/",
      trustScore: 90, importanceScore: 65, noveltyScore: 60,
      usefulnessScore: 70, urgencyScore: 50, compositeScore: 67.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-21"),
      tagSlugs: ["gemini", "pricing", "l1-usage"],
    },
    // === ポーカー ===
    {
      slug: "wsop-2026-schedule-announced",
      title: "WSOP 2026 スケジュール発表 — 5/26〜7/15、100ブレスレット争奪",
      summary3: "第57回WSOPの全日程が発表されました。\n5月26日〜7月15日、ラスベガスで100個のブレスレットを争います。\nメインイベントは7/2〜7/13、ファイナルテーブルは別日程に。\n出典: WSOP公式",
      summaryLong: "2026 WSOPはHorseshoe Las VegasとParis Las Vegasで開催。最安イベントは$300 Gladiators of Poker、最高額は$250,000 Super High Roller。新たにGGMillion$を冠した$10K High Rollerプレステージブレスレットが追加され、メインイベントのファイナルテーブルは「November Nine」時代を彷彿とさせる別日程で実施されます。ディフェンディングチャンピオンはMichael Mizrachi（2025年優勝、賞金$10M）。",
      whatChanged: "2026 WSOPフルスケジュール発表。100ブレスレット、新イベント追加",
      whoImpacted: "トーナメントポーカープレイヤー、WSOPサテライト参加者",
      actions: "スケジュールを確認し、参加イベントを計画してください。サテライトの早期エントリーも開始しています。",
      recommendation: "TRY" as const,
      depth: "DEEP" as const,
      sourceUrl: "https://www.wsop.com/news/the-world-series-of-poker-reveals-full-summer-2026-series-schedule/",
      trustScore: 95, importanceScore: 90, noveltyScore: 80,
      usefulnessScore: 90, urgencyScore: 60, compositeScore: 86.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-16"),
      tagSlugs: ["poker", "tournament"],
    },
    {
      slug: "agpt-2026-tokyo-roppongi",
      title: "AGPT東京 2/20〜23開催 — 賞金総額8,000万円、六本木で次世代ポーカー大会",
      summary3: "Asia Grand Poker Tournament（AGPT）が東京・六本木のベルサール六本木で開催。\n「直感は、データで進化する」をテーマに、プライズ総額8,000万円。\n国内プレイヤー人口は2年で200万→400万人に急増中。\n出典: テレ東プラス",
      summaryLong: "アジア発の次世代ポーカー大会AGPTが2026年2月20日〜23日に東京・六本木で開催されました。データを駆使した新しいポーカー体験を提供し、プライズ総額は8,000万円（予定）。日本のアミューズメントポーカーのプレイヤー人口は2023年の約200万人から2024年は約400万人へと急増しており、GTO的な高水準のプレイを追求するプレイヤーも増加しています。",
      whatChanged: "AGPT東京初開催、賞金8,000万円、国内ポーカー人口400万人到達",
      whoImpacted: "日本のトーナメントプレイヤー、ポーカー業界関係者",
      actions: "AGPTの結果をチェックし、次回開催情報に注目してください。",
      recommendation: "TRY" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://www.tv-tokyo.co.jp/plus/external-pr/entry/16266.html",
      trustScore: 90, importanceScore: 80, noveltyScore: 85,
      usefulnessScore: 75, urgencyScore: 40, compositeScore: 78.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-20"),
      tagSlugs: ["poker", "tournament"],
    },
    {
      slug: "tpc-season16-osaka-2026-02",
      title: "TPC Season 16 大阪・難波で開催 — 賞金総額6,000万円超",
      summary3: "TPC Season 16が2月20〜23日、大阪・難波御堂筋ホールで開催。\n総額6,000万円超のプライズを保証。2Daysメインイベント＋32サイドイベント。\n出典: Top of Poker Championship公式",
      summaryLong: null,
      whatChanged: "TPC Season 16開催、賞金6,000万円超保証、32サイドイベント",
      whoImpacted: "関西圏のポーカープレイヤー、大会参加者",
      actions: "TPC Season 17のスケジュールをフォローしてください。",
      recommendation: "MONITOR" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://topofpoker.com/",
      trustScore: 85, importanceScore: 70, noveltyScore: 65,
      usefulnessScore: 70, urgencyScore: 30, compositeScore: 67.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-20"),
      tagSlugs: ["poker", "tournament"],
    },
    {
      slug: "jopt-2026-tokyo01-messhi-winner",
      title: "JOPT 2026 Tokyo #01結果 — 「めっし」が3,241エントリーの頂点に",
      summary3: "JOPT 2026最初のMain Eventで「めっし」さんが優勝しました。\n3,241エントリーという大規模フィールドを制しての戴冠。\n出典: JOPT公式",
      summaryLong: null,
      whatChanged: "JOPT 2026 Tokyo #01 Main Event優勝者決定、3,241エントリー",
      whoImpacted: "JOPTプレイヤー、国内トーナメントシーン",
      actions: "JOPT 2026 Osaka #01（3/18〜22）のサテライト情報を確認してください。",
      recommendation: "MONITOR" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://japanopenpoker.com/tokyo/",
      trustScore: 90, importanceScore: 65, noveltyScore: 60,
      usefulnessScore: 60, urgencyScore: 20, compositeScore: 62.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-15"),
      tagSlugs: ["poker", "tournament"],
    },
    {
      slug: "lapc-2026-main-event-decline",
      title: "LA Poker Classic 2026 Main Event、過去最低の50エントリーに低迷",
      summary3: "WPT時代の人気大会LAPCのメインイベントが過去最低の50エントリーに。\n優勝賞金$158,030（賞金プール$465,000）。\nタイミングの悪さとギャランティなしが原因とLA勢は分析。\n出典: PokerNews",
      summaryLong: null,
      whatChanged: "LAPC Main Eventが過去最低の参加者数、WPTとの提携終了の影響",
      whoImpacted: "LAのポーカーコミュニティ、WPTファン",
      actions: "WPTの今後のスケジュールと会場変更を注視してください。",
      recommendation: "MONITOR" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://www.pokernews.com/news/2026/02/lapc-main-event-attendance-decline-50669.htm",
      trustScore: 85, importanceScore: 60, noveltyScore: 70,
      usefulnessScore: 55, urgencyScore: 15, compositeScore: 59.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-25"),
      tagSlugs: ["poker", "tournament"],
    },
    {
      slug: "gto-wizard-poker-strategy-2026",
      title: "GTO Wizard活用ガイド — 大会前の戦略構築に必須のポーカー学習ツール",
      summary3: "GTO Wizardはポーカーの最適戦略（GTO）を学べる定番ツールです。\n日本語対応・無料プランあり。プリフロップからリバーまでの判断を解析可能。\nサテライト・本戦でのEV最大化に直結する判断力を養成できます。\n出典: 各種レビュー",
      summaryLong: "GTO（Game Theory Optimal）戦略はポーカーにおける数学的に最適なプレイ方針です。GTO Wizardを使えば自分のプレイを解析し、プロと同じ思考法を習得できます。特にWPTやJOPTなどの本格ストラクチャー大会では1ハンドごとの判断力が結果を左右するため、GTO Wizardでの事前学習が推奨されています。",
      whatChanged: "GTO Wizardの活用法と大会前準備への応用",
      whoImpacted: "ポーカー中級〜上級者、大会参加者",
      actions: "GTO Wizardの無料プランで基本的なスポットを学習し、大会前の準備に活用してください。",
      recommendation: "TRY" as const,
      depth: "DEEP" as const,
      sourceUrl: "https://blog.gtowizard.com/",
      trustScore: 80, importanceScore: 75, noveltyScore: 50,
      usefulnessScore: 90, urgencyScore: 30, compositeScore: 71.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-18"),
      tagSlugs: ["poker", "strategy", "howto"],
    },
    {
      slug: "wsop-texas-first-event-2026",
      title: "WSOP初のテキサス開催が発表 — ポーカーの聖地が拡大",
      summary3: "WSOPが初めてテキサス州でのイベント開催を発表しました。\nWSOP Circuitの追加ストップとして大規模な参加が見込まれています。\n出典: PokerNews",
      summaryLong: null,
      whatChanged: "WSOP初のテキサス州イベント開催決定",
      whoImpacted: "テキサス州のポーカープレイヤー、WSOP Circuit参加者",
      actions: "テキサスイベントの詳細スケジュールと参加方法をフォローしてください。",
      recommendation: "MONITOR" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://www.pokernews.com/tours/wsop/2026-wsop/",
      trustScore: 85, importanceScore: 70, noveltyScore: 75,
      usefulnessScore: 60, urgencyScore: 25, compositeScore: 65.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-22"),
      tagSlugs: ["poker", "tournament"],
    },
    // === AV ===
    {
      slug: "seto-kanna-2026-flash-ranking-1st",
      title: "瀬戸環奈、2026年もFANZA通販1位を独走 — FLASH年間ランキングも制覇",
      summary3: "瀬戸環奈がFANZA通販ランキングで2週連続1位を獲得しました。\nFLASHセクシー女優ランキング2025でも1位、上半期・下半期ともに首位の圧倒的な存在感。\n出典: FANZA / FLASH",
      summaryLong: "瀬戸環奈の最新作『彼女の妹は最強ヒロイン!?』がFANZA通販フロアで2週連続1位にランクイン。光文社FLASH「セクシー女優ランキング2025」でも年間1位を獲得し、上半期・下半期両方で首位を維持する圧倒的な人気を誇っています。2026年のリリーススケジュールにも注目が集まっています。",
      whatChanged: "2026年2月もFANZA通販1位、FLASHランキング年間1位",
      whoImpacted: "AV業界ウォッチャー",
      actions: "最新作と今後のリリーススケジュールをチェック。",
      recommendation: "TRY" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://www.dmm.co.jp/digital/",
      trustScore: 85, importanceScore: 70, noveltyScore: 65,
      usefulnessScore: 70, urgencyScore: 20, compositeScore: 66.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-15"),
      tagSlugs: ["av"],
    },
    {
      slug: "kawagoe-niko-premium-nude-posebook-2026",
      title: "川越にこ『プレミアムヌードポーズブック』2/25発売 — S1人気女優の写真集",
      summary3: "S1所属の人気女優・川越にこの写真集『プレミアムヌードポーズブック』が2月25日に発売。\nデビュー作がFANZA週間ランキング上位を記録した注目の女優。\n出典: ジーオーティー",
      summaryLong: null,
      whatChanged: "川越にこの写真集発売",
      whoImpacted: "ファン、写真集コレクター",
      actions: "書店やオンラインで予約・購入。",
      recommendation: "MONITOR" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://www.neowing.co.jp/g-idol/whatsnew",
      trustScore: 80, importanceScore: 55, noveltyScore: 60,
      usefulnessScore: 60, urgencyScore: 35, compositeScore: 58.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-25"),
      tagSlugs: ["av"],
    },
    {
      slug: "harukawa-neruru-gravure-debut-2026",
      title: "春川ねるる グラビアデビュー — 2026年注目の新人",
      summary3: "春川ねるるがデビューイメージを1月にリリースしました。\n2026年のグラビア/AV業界で注目の新人の一人。\n出典: Neowing",
      summaryLong: null,
      whatChanged: "春川ねるるデビューイメージ発売",
      whoImpacted: "新人ウォッチャー",
      actions: "今後のリリース情報をフォロー。",
      recommendation: "MONITOR" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://www.neowing.co.jp/g-idol/whatsnew",
      trustScore: 75, importanceScore: 50, noveltyScore: 70,
      usefulnessScore: 55, urgencyScore: 15, compositeScore: 54.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-01-09"),
      tagSlugs: ["av"],
    },
    // === 起業 ===
    {
      slug: "jpyc-series-b-178-oku-2026-02",
      title: "JPYC、シリーズBで17.8億円を調達 — 日本円ステーブルコインの大型資金調達",
      summary3: "日本円連動型ステーブルコイン提供のJPYCがシリーズBファーストクローズで17.8億円調達。\nAsteriaがリード投資家。暗号資産規制整備に伴う大型調達。\n出典: 日本経済新聞",
      summaryLong: "JPYCは日本円連動型ステーブルコインの先駆者として、制度整備が進む日本市場での成長を加速させます。シリーズBでの17.8億円調達はブロックチェーン決済インフラの需要の高まりを示しています。",
      whatChanged: "JPYC シリーズB 17.8億円調達",
      whoImpacted: "暗号資産・フィンテック起業家、ブロックチェーン事業者",
      actions: "ステーブルコイン基盤の決済事業参入タイミングを検討。",
      recommendation: "MONITOR" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://www.nikkei.com/article/DGXZQOUC269DN0W6A220C2000000/",
      trustScore: 90, importanceScore: 75, noveltyScore: 70,
      usefulnessScore: 70, urgencyScore: 25, compositeScore: 68.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-27"),
      tagSlugs: ["startup", "management"],
    },
    {
      slug: "keidanren-startup-5year-plan-2026",
      title: "スタートアップ育成5か年計画 — 政府がバイオ・ライフサイエンス重点支援を発表",
      summary3: "経団連がスタートアップ育成5か年計画を発表。約350億ドル相当の予算を投下。\nバイオテク・ライフサイエンス分野への重点支援を開始。\n日本のユニコーン11社、新規ユニコーン誕生を加速。\n出典: 経団連タイムス",
      summaryLong: "政府主導のスタートアップ支援策が具体化し、バイオテク・ライフサイエンス分野を中心に補助金・助成金の拡充が進んでいます。ユニコーン企業の創出を加速させるアクセラレーター支援や規制緩和も予定されています。",
      whatChanged: "スタートアップ育成5か年計画発表、バイオ・ライフサイエンス重点支援",
      whoImpacted: "起業家、VC、バイオテク分野の研究者",
      actions: "政府系補助金・助成金の活用を検討。アクセラレーター支援の要件を確認。",
      recommendation: "TRY" as const,
      depth: "DEEP" as const,
      sourceUrl: "https://www.keidanren.or.jp/journal/times/2026/0226_07.html",
      trustScore: 90, importanceScore: 85, noveltyScore: 65,
      usefulnessScore: 85, urgencyScore: 40, compositeScore: 76.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-26"),
      tagSlugs: ["startup", "management"],
    },
    {
      slug: "yoake-ai-blockchain-fan-5oku-2026",
      title: "YOAKE Entertainment、AI×ブロックチェーンでファン体験事業に約5億円調達",
      summary3: "AIとブロックチェーン活用のファンエクスペリエンス企業YOAKEが約5億円を調達。\nエンタメ×テックで顧客体験の高度化を実現。\n出典: 各種報道",
      summaryLong: null,
      whatChanged: "YOAKE Entertainment 約5億円調達、エンタメ×テック事業強化",
      whoImpacted: "エンタメ業界関係者、AI・Web3起業家",
      actions: "エンタメ×テックの新規事業機会を検討。",
      recommendation: "MONITOR" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://www.nikkei.com/business/startups/",
      trustScore: 80, importanceScore: 65, noveltyScore: 70,
      usefulnessScore: 60, urgencyScore: 20, compositeScore: 60.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-13"),
      tagSlugs: ["startup"],
    },
    // === ウズベキスタン ===
    {
      slug: "uzbekistan-winter-tourism-ski-2026",
      title: "ウズベキスタン、冬季観光を本格化 — アミルソイ・スキーリゾートに80万人超来場",
      summary3: "ウズベキスタンのアミルソイ・スキーリゾートが80万人超を集客。外国人比率20%以上。\n冬を新たな観光シーズンとして確立する政策が進行中。\n出典: Euronews Travel",
      summaryLong: "ウズベキスタンは伝統的なシルクロード観光に加え、山岳地帯でのスキー・トレッキングを新たな冬季観光として展開。アミルソイリゾートは2024年70万人、2025年80万人超を達成し、急成長中です。",
      whatChanged: "冬季観光の本格化、アミルソイリゾート80万人超来場",
      whoImpacted: "旅行好き、中央アジアに関心のある方",
      actions: "冬のウズベキスタン旅行を計画。スキーシーズンは12月〜3月。",
      recommendation: "TRY" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://www.euronews.com/travel/2026/02/10/how-uzbekistan-is-turning-winter-into-a-travel-season",
      trustScore: 85, importanceScore: 65, noveltyScore: 75,
      usefulnessScore: 70, urgencyScore: 20, compositeScore: 63.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-10"),
      tagSlugs: ["uzbekistan"],
    },
    {
      slug: "uzbekistan-pakistan-trade-20b-2026",
      title: "ウズベキスタン・パキスタン、貿易額20億ドルへ — トランスアフガン鉄道も加速",
      summary3: "ウズベキスタンとパキスタンが貿易額を5億→20億ドルに拡大する方針で合意。\nトランスアフガン鉄道建設プロジェクトも加速。\n出典: ジェトロ",
      summaryLong: "ミルジヨエフ大統領の2月パキスタン訪問で交通・物流インフラ強化に合意。中央アジア〜南アジアの貿易ルート確立がビジネスチャンスとなる見込みです。",
      whatChanged: "パキスタンとの貿易額20億ドル目標、鉄道建設加速",
      whoImpacted: "中央アジアビジネスに関心のある企業・投資家",
      actions: "トランスアフガン鉄道プロジェクトの進展を注視。",
      recommendation: "MONITOR" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://www.jetro.go.jp/biznews/2026/02/c3cba67fb75cd19b.html",
      trustScore: 90, importanceScore: 70, noveltyScore: 65,
      usefulnessScore: 55, urgencyScore: 15, compositeScore: 60.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-06"),
      tagSlugs: ["uzbekistan"],
    },
    {
      slug: "uzbekistan-12m-tourists-target-2026",
      title: "ウズベキスタン、1,000以上の新宿泊施設で観光客1,200万人を目指す",
      summary3: "ウズベキスタンが1,000以上の新規宿泊施設を建設中。AI活用の次世代ホスピタリティを推進。\nブハラ・サマルカンド・ヒヴァに加え新興地域も開発。\n2026年までに1,200万人の観光客誘致を目標。\n出典: Travel and Tour World",
      summaryLong: null,
      whatChanged: "1,000以上の新宿泊施設建設、1,200万人の観光客目標",
      whoImpacted: "旅行業界、ホテル事業者、中央アジア投資家",
      actions: "ウズベキスタンのホテル投資・旅行事業参入を検討。",
      recommendation: "MONITOR" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://www.travelandtourworld.com/news/article/uzbekistan-poised-to-revolutionize-travel-landscape-with-over-one-thousand-new-accommodation-facilities-expanding-tourism-horizons-and-infrastructure-by-2026/",
      trustScore: 80, importanceScore: 65, noveltyScore: 70,
      usefulnessScore: 60, urgencyScore: 15, compositeScore: 58.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-15"),
      tagSlugs: ["uzbekistan", "hotel"],
    },
    // === ホテル ===
    {
      slug: "japan-hotel-inbound-4268man-2026",
      title: "訪日外国人4,268万人 — ホテル業界「量から質へ」のシフトが加速",
      summary3: "2026年のホテル業界は訪日外国人4,268万人を背景に「量から質」へシフト。\n長期滞在・体験型需要が成長。稼働率+3.2pt、客室単価+10.8%と堅調。\n出典: Colliers Japan",
      summaryLong: "訪日外国人の増加に伴い、ホテル業界はオーバーツーリズム対策と高付加価値化を同時に推進。WBC、アジア大会、PokéPark関東などの大型イベントがインバウンド需要を支援しています。",
      whatChanged: "インバウンド4,268万人、量から質へのシフト、ADR+10.8%",
      whoImpacted: "ホテル経営者、観光業界関係者、不動産投資家",
      actions: "体験型・長期滞在プランの開発を検討。ADR引き上げ戦略を実行。",
      recommendation: "TRY" as const,
      depth: "DEEP" as const,
      sourceUrl: "https://www.colliers.com/en-jp/research/japan-hospitality-insights-february-2026",
      trustScore: 90, importanceScore: 85, noveltyScore: 65,
      usefulnessScore: 85, urgencyScore: 35, compositeScore: 75.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-20"),
      tagSlugs: ["hotel", "management"],
    },
    {
      slug: "hotel-chain-top-zadankai-2026",
      title: "大手ホテルチェーン座談会2026 — 人材育成と待遇強化が最重要課題に",
      summary3: "三井不動産、三菱地所、オリックスなど大手ホテルチェーンが2026年戦略を議論。\n人材育成と待遇面の強化が最重要課題として共有。\n出典: 観光経済新聞",
      summaryLong: null,
      whatChanged: "大手チェーンが人材戦略を最優先課題に設定",
      whoImpacted: "ホテル業界従事者、人事担当者、就職活動中の学生",
      actions: "自社の人材育成・待遇プランを見直し。競合他社の施策をベンチマーク。",
      recommendation: "MONITOR" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://www.kankokeizai.com/2601090630kks/",
      trustScore: 85, importanceScore: 70, noveltyScore: 55,
      usefulnessScore: 75, urgencyScore: 25, compositeScore: 64.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-15"),
      tagSlugs: ["hotel", "management"],
    },
    {
      slug: "hotel-supply-rate-17pct-cost-2026",
      title: "ホテル新規供給率わずか1.7% — 建設コスト高騰が業界に与える影響",
      summary3: "2026年のホテル新規供給率は1.7%と低水準。建設費高騰が主因。\n一方、稼働率・客室単価は堅調に推移し既存ホテルには追い風。\n出典: 宿研ナレッジ",
      summaryLong: null,
      whatChanged: "新規供給率1.7%、建設コスト高騰の影響",
      whoImpacted: "ホテル開発・投資家、既存ホテルオーナー",
      actions: "既存物件のリノベーション・ADR最適化に注力。新規開発は慎重に。",
      recommendation: "MONITOR" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://www.yadoken.net/archives/column/",
      trustScore: 80, importanceScore: 65, noveltyScore: 55,
      usefulnessScore: 70, urgencyScore: 20, compositeScore: 60.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-10"),
      tagSlugs: ["hotel"],
    },
    // === 香水 ===
    {
      slug: "dior-addict-first-fragrance-2026",
      title: "ディオール アディクト初のフレグランス登場 — 2026年春コスメの注目香水",
      summary3: "ディオールが「アディクト」ライン初のフレグランスを2026年1月1日に発売。\nバニラ・マシュマロなどグルマン系（スイーツ香り）が2026年春のメイントレンド。\n出典: ファッションプレス",
      summaryLong: "2026年春のフレグランストレンドは「美味しい香り（グルマン系）」と「アジア発」がメインテーマ。ディオール、エルメス、ゲランなどの名門ブランドから新作が続々登場しています。",
      whatChanged: "ディオール アディクト初フレグランス発売、グルマン系がトレンドに",
      whoImpacted: "香水愛好家、コスメに関心のある方",
      actions: "店舗でテスターを試す。百貨店のカウンターで購入可能。",
      recommendation: "TRY" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://www.fashion-press.net/news/139851",
      trustScore: 85, importanceScore: 65, noveltyScore: 75,
      usefulnessScore: 70, urgencyScore: 30, compositeScore: 66.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-01-15"),
      tagSlugs: ["perfume"],
    },
    {
      slug: "hermes-musc-pallida-2026",
      title: "エルメス新作「ムスク パリダ」— パウダリーなアイリスとムスクの融合",
      summary3: "エルメスが新フレグランス「ムスク パリダ」を1月23日に発売。\nパウダリーなアイリスとやわらかなムスクの融合が特徴。\n出典: 美ST ONLINE",
      summaryLong: null,
      whatChanged: "エルメス「ムスク パリダ」新発売",
      whoImpacted: "香水コレクター、エルメスファン",
      actions: "エルメスブティックまたは百貨店で試香。",
      recommendation: "MONITOR" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://be-story.jp/make-up/230424/",
      trustScore: 80, importanceScore: 55, noveltyScore: 70,
      usefulnessScore: 65, urgencyScore: 20, compositeScore: 58.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-01-23"),
      tagSlugs: ["perfume"],
    },
    {
      slug: "fragrance-trend-unisex-2026",
      title: "2026年フレグランストレンド — ユニセックス需要25%増、サステナブルリフィル台頭",
      summary3: "2026年のグローバルフレグランス市場でユニセックス香水の需要が25%増加予測。\nリフィル対応ボトルやサステナブルパッケージが主流に。\n出典: Marie Claire",
      summaryLong: "グローバルなフレグランストレンドとして、性別を問わないユニセックス香水の人気が急上昇。ボトルデザインではメタリック仕上げやジュエリー風キャップ、リフィル対応のサステナブル設計が注目されています。",
      whatChanged: "ユニセックス需要+25%、リフィル対応ボトルの主流化",
      whoImpacted: "香水ブランド、消費者、小売業者",
      actions: "ユニセックス・リフィル対応の新作をチェック。",
      recommendation: "MONITOR" as const,
      depth: "DEEP" as const,
      sourceUrl: "https://www.marieclaire.com/beauty/fragrance/best-2026-perfumes/",
      trustScore: 80, importanceScore: 60, noveltyScore: 70,
      usefulnessScore: 65, urgencyScore: 15, compositeScore: 58.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-01"),
      tagSlugs: ["perfume"],
    },
    // === ガジェット ===
    {
      slug: "polar-loop-screenless-smartwatch-2026",
      title: "POLAR Loop — スクリーンレスの健康管理スマートウォッチが登場",
      summary3: "スクリーンを搭載しない新コンセプトのスマートウォッチPOLAR Loopが登場。\n活動量・睡眠データを自動記録。サブスク不要のヘルスケア特化設計。\n出典: Yanko Design",
      summaryLong: "POLAR Loopはディスプレイを排除することでバッテリー持続時間を最大化し、健康データの記録に特化した新しいウェアラブルデバイスです。サブスクリプション不要で利用可能。",
      whatChanged: "スクリーンレスの健康管理ウォッチ発売",
      whoImpacted: "健康管理に関心のある方、ウェアラブルデバイスユーザー",
      actions: "公式サイトで仕様を確認し、ヘルスケア用途での購入を検討。",
      recommendation: "TRY" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://www.yankodesign.com/2026/02/05/5-best-tech-gadgets-of-february-2026/",
      trustScore: 75, importanceScore: 60, noveltyScore: 80,
      usefulnessScore: 70, urgencyScore: 25, compositeScore: 63.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-05"),
      tagSlugs: ["gadget"],
    },
    {
      slug: "huawei-freeclip2-open-ear-2026",
      title: "HUAWEI FreeClip 2 — 耳を塞がないオープンイヤーイヤホンの進化版",
      summary3: "HUAWEIのオープンイヤーイヤホンFreeClip 2が登場。\n音質と操作性を向上。耳を塞がない快適な装着感がさらに進化。\n出典: 各種レビュー",
      summaryLong: null,
      whatChanged: "FreeClip 2リリース、音質・操作性向上",
      whoImpacted: "ワイヤレスイヤホンユーザー、ランナー・通勤者",
      actions: "家電量販店で試着して装着感を確認。",
      recommendation: "TRY" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://katsukichi-life.com/k-life-news-2026-01-02",
      trustScore: 75, importanceScore: 55, noveltyScore: 65,
      usefulnessScore: 70, urgencyScore: 25, compositeScore: 59.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-10"),
      tagSlugs: ["gadget"],
    },
    {
      slug: "sony-ai-music-identification-2026",
      title: "ソニー、AI生成音楽の原典を特定する技術を開発 — 著作権保護へ",
      summary3: "ソニーがAI生成音楽の原典ソースを特定する新技術を発表。\nクリエイターの著作権保護とAI学習の無断使用防止が目的。\n出典: 各種報道",
      summaryLong: "ソニーグループはAI音楽生成に対する著作権懸念の高まりを受け、生成された音楽がどのトレーニングデータに基づいているかを特定する技術を開発しました。音楽業界全体の著作権保護に大きな一歩となります。",
      whatChanged: "AI音楽の原典特定技術開発",
      whoImpacted: "音楽クリエイター、AI音楽サービス提供者、著作権管理団体",
      actions: "AI音楽生成を使用する場合、著作権確認プロセスの見直しを。",
      recommendation: "MONITOR" as const,
      depth: "DEEP" as const,
      sourceUrl: "https://note.com/gadget_news/n/ndb0f6d4b4a01",
      trustScore: 80, importanceScore: 75, noveltyScore: 80,
      usefulnessScore: 70, urgencyScore: 20, compositeScore: 67.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-15"),
      tagSlugs: ["gadget"],
    },
    // === 大阪ポーカー ===
    {
      slug: "osaka-usop-prize-3300man-2026",
      title: "USOP大阪 梅田開催 — プライズ3,300万円の大型ポーカー大会",
      summary3: "U Series of Poker（USOP）が大阪・梅田で開催。プライズ総額3,300万円。\n2026年も大阪は主要ポーカー大会の集積地に。\n出典: light-three.com",
      summaryLong: null,
      whatChanged: "USOP大阪開催、プライズ3,300万円",
      whoImpacted: "大阪のポーカープレイヤー、トーナメント参加者",
      actions: "USOP大阪のサテライト情報を確認し、エントリーを計画。",
      recommendation: "TRY" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://light-three.com/osaka-tournament/",
      trustScore: 80, importanceScore: 70, noveltyScore: 60,
      usefulnessScore: 75, urgencyScore: 45, compositeScore: 67.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-20"),
      tagSlugs: ["osaka-poker", "poker", "tournament"],
    },
    {
      slug: "casino-cafe-namba-marui-renewal-2026",
      title: "カジノカフェなんばマルイが移転リニューアル — 7Fでポーカー・カジノゲーム",
      summary3: "カジノカフェなんばマルイが2月1日に7Fへ移転リニューアルオープン。\nテキサスホールデムポーカー、ルーレット、ブラックジャック等を提供。\n初心者〜上級者まで対応。\n出典: poker-choice.com",
      summaryLong: null,
      whatChanged: "カジノカフェなんばマルイ 7F移転リニューアル",
      whoImpacted: "難波周辺のポーカープレイヤー、初心者",
      actions: "なんばマルイ7Fの新店舗でポーカーを楽しんでみてください。",
      recommendation: "TRY" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://poker-choice.com/amusement-casino/pokerroom-namba/",
      trustScore: 75, importanceScore: 55, noveltyScore: 60,
      usefulnessScore: 70, urgencyScore: 20, compositeScore: 57.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-01"),
      tagSlugs: ["osaka-poker", "poker"],
    },
    // === 大阪風俗・ミナミ ===
    {
      slug: "minami-nightlife-guide-2026",
      title: "大阪ミナミ 繁華街ガイド2026 — 道頓堀・心斎橋・千日前の最新事情",
      summary3: "大阪ミナミ（難波・心斎橋・道頓堀・千日前）の繁華街が進化中。\nインバウンド急増で新規出店が活況。飲食・娯楽・ナイトライフが充実。\n出典: nippon.com",
      summaryLong: "ミナミは江戸時代から続く大阪の繁華街で、難波、心斎橋、道頓堀、千日前などを含みます。2026年はインバウンド需要の急増により新規出店が活況を呈しています。",
      whatChanged: "インバウンド急増でミナミ繁華街が活況",
      whoImpacted: "大阪在住者、ナイトライフに関心のある方",
      actions: "ミナミエリアの最新スポットを探索。",
      recommendation: "MONITOR" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://www.nippon.com/ja/guide-to-japan/gu900112/",
      trustScore: 80, importanceScore: 55, noveltyScore: 50,
      usefulnessScore: 65, urgencyScore: 15, compositeScore: 54.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-15"),
      tagSlugs: ["minami", "osaka-fuzoku", "osaka-local"],
    },
    // === 大阪ローカル ===
    {
      slug: "osaka-vietnam-festival-2026-03",
      title: "ベトナムフェスティバル2026大阪 — 大阪城公園で3/7-8開催、入場無料",
      summary3: "大阪城公園 太陽の広場でベトナムフェスティバルが3月7〜8日に開催されます。\n約70の本場グルメブース出店、昨年は10万人が来場の人気イベント。\n入場無料。\n出典: 大阪オンライン",
      summaryLong: "ベトナムの人気アーティストによる音楽ステージや、約70の本場ベトナムグルメブースが出店する大規模イベントです。昨年は10万人が来場した人気イベントで、入場無料。大阪城公園というアクセスの良い会場で、週末のおでかけに最適です。",
      whatChanged: "ベトナムフェスティバル大阪 3/7-8開催",
      whoImpacted: "大阪在住のグルメ好き、週末のおでかけを探している方",
      actions: "3/7-8の予定を空けて、大阪城公園へ。早めの時間帯が混雑回避におすすめ。",
      recommendation: "TRY" as const,
      depth: "DETAILED" as const,
      sourceUrl: "https://osaka-online.jp/column/osaka-march-event/",
      trustScore: 85, importanceScore: 70, noveltyScore: 65,
      usefulnessScore: 80, urgencyScore: 60, compositeScore: 74.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-25"),
      tagSlugs: ["osaka-local"],
    },
    {
      slug: "sennan-kaki-matsuri-2026",
      title: "泉南牡蠣まつり開催中 — 3/29まで SENNAN LONG PARKで旬の牡蠣を堪能",
      summary3: "SENNAN LONG PARKで泉南牡蠣まつりが3月29日まで開催中。\n入場無料、旬の牡蠣を楽しめる期間限定イベント。\n3/8・3/21にはあったかいもんフェスも同時開催。\n出典: ウォーカープラス",
      summaryLong: null,
      whatChanged: "泉南牡蠣まつり〜3/29、あったかいもんフェス3/8・3/21同時開催",
      whoImpacted: "大阪南部・泉南エリアの住民、牡蠣好き",
      actions: "週末に泉南まで足を延ばして牡蠣を楽しんでみてください。",
      recommendation: "TRY" as const,
      depth: "BREAKING" as const,
      sourceUrl: "https://www.walkerplus.com/event_list/ar0727/eg0117/",
      trustScore: 80, importanceScore: 60, noveltyScore: 55,
      usefulnessScore: 75, urgencyScore: 50, compositeScore: 66.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-20"),
      tagSlugs: ["osaka-local"],
    },
    {
      slug: "osaka-march-events-2026",
      title: "【2026年3月】大阪イベント12選 — 梅まつり・フードフェス・展望台グルメまで",
      summary3: "3月の大阪は梅まつりからフードフェスまでイベントが盛りだくさん。\nハルカス300展望台グルメ（〜3/29）、千里阪急ホテルラストフェア（〜3/30）なども。\n春休みで混雑するため早め行動がおすすめ。\n出典: 大阪オンライン",
      summaryLong: "大阪の3月は多彩なイベントが目白押し。ズートピア2 OH MY CAFE（KITTE大阪、〜3/8）、都シティ大阪天王寺の本ズワイ蟹食べ放題ブッフェ（〜3/31）、ハルカス300展望台のおでん・鍋イベント（〜3/29）、56年の歴史に幕を閉じる千里阪急ホテルのラストフェア（〜3/30）など。春休みは混雑するため主要路線は1本早い電車がおすすめです。",
      whatChanged: "2026年3月の大阪イベントまとめ",
      whoImpacted: "大阪在住者、週末プランを探している方",
      actions: "気になるイベントの日程を確認し、予約が必要なものは早めに手配。",
      recommendation: "TRY" as const,
      depth: "DEEP" as const,
      sourceUrl: "https://osaka-online.jp/column/osaka-march-event/",
      trustScore: 80, importanceScore: 65, noveltyScore: 60,
      usefulnessScore: 80, urgencyScore: 55, compositeScore: 71.0,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-02-26"),
      tagSlugs: ["osaka-local"],
    },
  ];
}
