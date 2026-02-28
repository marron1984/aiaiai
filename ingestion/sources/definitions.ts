/**
 * MVPソース定義
 * 公式一次情報を最優先に定義
 */

export interface SourceDefinition {
  name: string;
  slug: string;
  type: "OFFICIAL" | "RSS" | "GITHUB" | "X";
  url: string;
  feedUrl?: string;
  fetchMethod: "rss" | "html" | "github-releases" | "x-api" | "x-search";
  trustScore: number;
  frequency: "HOURLY" | "DAILY" | "WEEKLY";
  legalNotes?: string;
  /** 自動タグ付け用: プロダクトタグのslug */
  productTagSlugs: string[];
}

export const MVP_SOURCES: SourceDefinition[] = [
  // === OpenAI ===
  {
    name: "ChatGPT リリースノート（日本語）",
    slug: "chatgpt-release-notes-ja",
    type: "OFFICIAL",
    url: "https://help.openai.com/ja-jp/articles/6825453-chatgpt-%E3%83%AA%E3%83%AA%E3%83%BC%E3%82%B9%E3%83%8E%E3%83%BC%E3%83%88",
    fetchMethod: "html",
    trustScore: 95,
    frequency: "DAILY",
    legalNotes: "公式ヘルプページ。要約・引用のみ。全文転載禁止。",
    productTagSlugs: ["chatgpt"],
  },
  {
    name: "ChatGPT Release Notes (EN)",
    slug: "chatgpt-release-notes-en",
    type: "OFFICIAL",
    url: "https://help.openai.com/en/articles/6825453-chatgpt-release-notes",
    fetchMethod: "html",
    trustScore: 95,
    frequency: "DAILY",
    legalNotes: "公式ヘルプページ。要約・引用のみ。",
    productTagSlugs: ["chatgpt"],
  },
  {
    name: "OpenAI Developers Changelog",
    slug: "openai-developers-changelog",
    type: "RSS",
    url: "https://developers.openai.com/changelog/",
    feedUrl: "https://developers.openai.com/changelog/rss.xml",
    fetchMethod: "rss",
    trustScore: 95,
    frequency: "DAILY",
    legalNotes: "公式Developer changelog。RSS配信あり。",
    productTagSlugs: ["openai-api"],
  },

  // === Anthropic ===
  {
    name: "Claude Developer Platform Release Notes",
    slug: "claude-platform-release-notes",
    type: "OFFICIAL",
    url: "https://docs.anthropic.com/en/docs/about-claude/models",
    fetchMethod: "html",
    trustScore: 95,
    frequency: "DAILY",
    legalNotes: "公式リリースノート。",
    productTagSlugs: ["claude"],
  },
  {
    name: "Claude Code GitHub Releases",
    slug: "claude-code-github-releases",
    type: "GITHUB",
    url: "https://github.com/anthropics/claude-code",
    fetchMethod: "github-releases",
    trustScore: 90,
    frequency: "DAILY",
    legalNotes:
      "GitHub REST API利用。レート制限（未認証60回/時）を遵守。",
    productTagSlugs: ["claude-code", "claude"],
  },

  // === Google Gemini ===
  {
    name: "Gemini アプリ リリースノート（日本語）",
    slug: "gemini-app-release-notes-ja",
    type: "OFFICIAL",
    url: "https://blog.google/products/gemini/",
    fetchMethod: "html",
    trustScore: 95,
    frequency: "DAILY",
    legalNotes: "公式リリースノート。",
    productTagSlugs: ["gemini"],
  },
  {
    name: "Gemini API Changelog",
    slug: "gemini-api-changelog",
    type: "OFFICIAL",
    url: "https://ai.google.dev/gemini-api/docs/changelog",
    fetchMethod: "html",
    trustScore: 90,
    frequency: "DAILY",
    legalNotes: "公式API changelog。",
    productTagSlugs: ["gemini"],
  },

  // === コミュニティブログ（一般の人の記事） ===
  // 吉田ペルソナ（Biz実装層/L1-L2）に刺さる実践的な記事を収集
  {
    name: "Zenn — ChatGPT",
    slug: "zenn-chatgpt",
    type: "RSS",
    url: "https://zenn.dev/topics/chatgpt",
    feedUrl: "https://zenn.dev/topics/chatgpt/feed",
    fetchMethod: "rss",
    trustScore: 50,
    frequency: "DAILY",
    legalNotes: "ZennのRSSフィード。要約・引用のみ。全文転載禁止。",
    productTagSlugs: ["chatgpt"],
  },
  {
    name: "Zenn — Claude",
    slug: "zenn-claude",
    type: "RSS",
    url: "https://zenn.dev/topics/claude",
    feedUrl: "https://zenn.dev/topics/claude/feed",
    fetchMethod: "rss",
    trustScore: 50,
    frequency: "DAILY",
    legalNotes: "ZennのRSSフィード。要約・引用のみ。全文転載禁止。",
    productTagSlugs: ["claude"],
  },
  {
    name: "Zenn — Gemini",
    slug: "zenn-gemini",
    type: "RSS",
    url: "https://zenn.dev/topics/gemini",
    feedUrl: "https://zenn.dev/topics/gemini/feed",
    fetchMethod: "rss",
    trustScore: 50,
    frequency: "DAILY",
    legalNotes: "ZennのRSSフィード。要約・引用のみ。全文転載禁止。",
    productTagSlugs: ["gemini"],
  },
  {
    name: "Zenn — 生成AI活用",
    slug: "zenn-generative-ai",
    type: "RSS",
    url: "https://zenn.dev/topics/生成ai",
    feedUrl: "https://zenn.dev/topics/%E7%94%9F%E6%88%90ai/feed",
    fetchMethod: "rss",
    trustScore: 50,
    frequency: "DAILY",
    legalNotes: "ZennのRSSフィード。要約・引用のみ。全文転載禁止。",
    productTagSlugs: [],
  },
  {
    name: "Qiita — ChatGPT",
    slug: "qiita-chatgpt",
    type: "RSS",
    url: "https://qiita.com/tags/chatgpt",
    feedUrl: "https://qiita.com/tags/chatgpt/feed",
    fetchMethod: "rss",
    trustScore: 50,
    frequency: "DAILY",
    legalNotes: "QiitaのRSSフィード。要約・引用のみ。全文転載禁止。",
    productTagSlugs: ["chatgpt"],
  },
  {
    name: "Qiita — Claude",
    slug: "qiita-claude",
    type: "RSS",
    url: "https://qiita.com/tags/claude",
    feedUrl: "https://qiita.com/tags/claude/feed",
    fetchMethod: "rss",
    trustScore: 50,
    frequency: "DAILY",
    legalNotes: "QiitaのRSSフィード。要約・引用のみ。全文転載禁止。",
    productTagSlugs: ["claude"],
  },
  {
    name: "Qiita — 生成AI",
    slug: "qiita-generative-ai",
    type: "RSS",
    url: "https://qiita.com/tags/生成ai",
    feedUrl: "https://qiita.com/tags/%E7%94%9F%E6%88%90ai/feed",
    fetchMethod: "rss",
    trustScore: 50,
    frequency: "DAILY",
    legalNotes: "QiitaのRSSフィード。要約・引用のみ。全文転載禁止。",
    productTagSlugs: [],
  },
  {
    name: "note — AI活用",
    slug: "note-ai",
    type: "RSS",
    url: "https://note.com/hashtag/AI活用",
    feedUrl: "https://note.com/hashtag/AI%E6%B4%BB%E7%94%A8/rss",
    fetchMethod: "rss",
    trustScore: 45,
    frequency: "DAILY",
    legalNotes: "noteのRSSフィード。要約・引用のみ。全文転載禁止。",
    productTagSlugs: [],
  },

  // === X（速報補助・規約遵守: APIのみ） ===
  {
    name: "X — OpenAI 公式",
    slug: "x-openai",
    type: "X",
    url: "https://x.com/OpenAI",
    fetchMethod: "x-api",
    trustScore: 70,
    frequency: "DAILY",
    legalNotes: "X API v2利用。スクレイピング禁止。速報補助として扱い、裏取り前は隔離ラベル付き。",
    productTagSlugs: ["chatgpt", "openai-api"],
  },
  {
    name: "X — Anthropic 公式",
    slug: "x-anthropic",
    type: "X",
    url: "https://x.com/AnthropicAI",
    fetchMethod: "x-api",
    trustScore: 70,
    frequency: "DAILY",
    legalNotes: "X API v2利用。スクレイピング禁止。速報補助として扱い、裏取り前は隔離ラベル付き。",
    productTagSlugs: ["claude", "claude-code"],
  },
  {
    name: "X — Google DeepMind 公式",
    slug: "x-google-deepmind",
    type: "X",
    url: "https://x.com/GoogleDeepMind",
    fetchMethod: "x-api",
    trustScore: 70,
    frequency: "DAILY",
    legalNotes: "X API v2利用。スクレイピング禁止。速報補助として扱い、裏取り前は隔離ラベル付き。",
    productTagSlugs: ["gemini"],
  },
  {
    name: "X — AI活用トピック検索",
    slug: "x-ai-topics",
    type: "X",
    url: "https://x.com/search",
    fetchMethod: "x-search",
    trustScore: 30,
    frequency: "DAILY",
    legalNotes: "X API v2 search/recent利用。スクレイピング禁止。速報ラベルで隔離。裏取り必須。",
    productTagSlugs: [],
  },
];
