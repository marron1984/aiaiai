import { FetchedItem } from "./rss";
import RssParser from "rss-parser";

const parser = new RssParser({
  timeout: 15000,
});

/**
 * Google News RSS でキーワード検索
 * 全カテゴリ横断で速報をキャッチする最強のソース
 *
 * URL形式: https://news.google.com/rss/search?q=KEYWORD&hl=ja&gl=JP&ceid=JP:ja
 */
export async function fetchGoogleNews(
  keyword: string,
  options?: { hl?: string; gl?: string; maxItems?: number }
): Promise<FetchedItem[]> {
  const hl = options?.hl || "ja";
  const gl = options?.gl || "JP";
  const maxItems = options?.maxItems || 20;

  const encodedKeyword = encodeURIComponent(keyword);
  const feedUrl = `https://news.google.com/rss/search?q=${encodedKeyword}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`;

  try {
    const feed = await parser.parseURL(feedUrl);

    return (feed.items || []).slice(0, maxItems).map((item) => ({
      title: item.title || "Untitled",
      url: item.link || "",
      content: item.contentSnippet || item.content || undefined,
      publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
    }));
  } catch (error) {
    console.warn(`Google News fetch failed for "${keyword}":`, error);
    return [];
  }
}

/**
 * Google News RSS フィードURL を生成
 * definitions.ts で feedUrl として使用
 */
export function buildGoogleNewsFeedUrl(
  keyword: string,
  hl = "ja",
  gl = "JP"
): string {
  const encodedKeyword = encodeURIComponent(keyword);
  return `https://news.google.com/rss/search?q=${encodedKeyword}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`;
}
