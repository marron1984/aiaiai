import RssParser from "rss-parser";

export interface FetchedItem {
  title: string;
  url: string;
  content?: string;
  publishedAt?: Date;
}

const parser = new RssParser({
  timeout: 10000,
});

/**
 * RSS/Atom フィードからアイテムを取得
 */
export async function fetchRss(feedUrl: string): Promise<FetchedItem[]> {
  const feed = await parser.parseURL(feedUrl);

  return (feed.items || []).map((item) => ({
    title: item.title || "Untitled",
    url: item.link || "",
    content: item.contentSnippet || item.content || undefined,
    publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
  }));
}
