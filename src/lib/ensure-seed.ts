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
 * Vercel初回デプロイ時にシードデータを自動作成
 * タグ・ソース・サンプル記事が0件なら一括作成する
 * 既にシード済みでも新規ソース・新規記事は追加する
 */
export async function ensureSeedData(): Promise<void> {
  if (seeded) return;

  try {
    // 既存DBでも新規ソース・記事は常に同期
    await syncSources();
    await syncLatestArticles();

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
  ];
}
