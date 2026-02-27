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
  fetchMethod: "rss" | "html" | "github-releases";
  trustScore: number;
  frequency: "HOURLY" | "DAILY" | "WEEKLY";
  legalNotes?: string;
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
  },

  // === Anthropic ===
  {
    name: "Claude Developer Platform Release Notes",
    slug: "claude-platform-release-notes",
    type: "OFFICIAL",
    url: "https://platform.claude.com/docs/en/release-notes/overview",
    fetchMethod: "html",
    trustScore: 95,
    frequency: "DAILY",
    legalNotes: "公式リリースノート。",
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
  },

  // === Google Gemini ===
  {
    name: "Gemini アプリ リリースノート（日本語）",
    slug: "gemini-app-release-notes-ja",
    type: "OFFICIAL",
    url: "https://gemini.google/jp/release-notes/?hl=ja",
    fetchMethod: "html",
    trustScore: 95,
    frequency: "DAILY",
    legalNotes: "公式リリースノート。",
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
  },
];
