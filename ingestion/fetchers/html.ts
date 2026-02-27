import * as cheerio from "cheerio";
import { FetchedItem } from "./rss";

/**
 * HTMLページからコンテンツを取得
 * robots.txt尊重: User-Agent明記、適切な間隔で取得
 */
export async function fetchHtmlPage(pageUrl: string): Promise<FetchedItem[]> {
  const response = await fetch(pageUrl, {
    headers: {
      "User-Agent": "aiaiai-ingestion/1.0 (AI news aggregator)",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} for ${pageUrl}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // ページタイトルとメタ情報を抽出
  const pageTitle =
    $("title").text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    "Untitled";

  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  // メインコンテンツの抽出（全文転載回避: 最大500文字）
  const mainContent =
    $("article").text().trim() ||
    $("main").text().trim() ||
    $(".content").text().trim() ||
    "";
  const contentSnippet = mainContent.slice(0, 500).replace(/\s+/g, " ").trim();

  return [
    {
      title: pageTitle,
      url: pageUrl,
      content: contentSnippet || description || undefined,
      publishedAt: extractDate($),
    },
  ];
}

/**
 * ページから日付を抽出
 */
function extractDate($: cheerio.CheerioAPI): Date | undefined {
  // OGP日付
  const ogDate = $('meta[property="article:published_time"]').attr("content");
  if (ogDate) return new Date(ogDate);

  // time要素
  const timeEl = $("time").first().attr("datetime");
  if (timeEl) return new Date(timeEl);

  return undefined;
}
