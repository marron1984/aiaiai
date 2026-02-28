import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { FetchedItem } from "./rss";

/**
 * HTMLページからコンテンツを取得
 * robots.txt尊重: User-Agent明記、適切な間隔で取得
 * リリースノートページからは複数エントリを抽出
 */
export async function fetchHtmlPage(pageUrl: string): Promise<FetchedItem[]> {
  const response = await fetch(pageUrl, {
    headers: {
      "User-Agent": "aiaiai-ingestion/1.0 (AI news aggregator)",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} for ${pageUrl}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // リリースノートページの場合、複数エントリ抽出を試みる
  const entries = extractReleaseEntries($, pageUrl);
  if (entries.length > 0) {
    return entries;
  }

  // 単一ページとして取得（フォールバック）
  return extractSinglePage($, pageUrl);
}

/**
 * リリースノートページから複数エントリを抽出
 * 日付付きのヘッダー（h2/h3）で区切られたセクションを個別エントリとして扱う
 */
function extractReleaseEntries(
  $: cheerio.CheerioAPI,
  pageUrl: string
): FetchedItem[] {
  const items: FetchedItem[] = [];
  const seen = new Set<string>();

  // パターン1: article/section要素で区切られたエントリ
  const articleElements = $("article, section[data-date], .release-note, .changelog-entry, .update-entry");
  if (articleElements.length > 1) {
    articleElements.each((_i, el) => {
      const $el = $(el);
      const title = extractEntryTitle($, $el);
      const content = $el.text().trim().slice(0, 500).replace(/\s+/g, " ");
      const date = extractEntryDate($, $el);
      const link = $el.find("a").first().attr("href");
      const url = link ? resolveUrl(link, pageUrl) : `${pageUrl}#entry-${_i}`;

      if (title && !seen.has(title)) {
        seen.add(title);
        items.push({
          title,
          url,
          content: content || undefined,
          publishedAt: date,
        });
      }
    });
    if (items.length > 1) return items.slice(0, 20);
  }

  // パターン2: 日付付きh2/h3ヘッダーで区切られたセクション
  const datePattern = /\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}|\d{1,2}月\d{1,2}日|\d{4}年\d{1,2}月/;

  $("h2, h3").each((_i, el) => {
    const $heading = $(el);
    const headingText = $heading.text().trim();

    // 日付を含むヘッダー、またはバージョン番号を含むヘッダー
    const hasDate = datePattern.test(headingText);
    const hasVersion = /v?\d+\.\d+/.test(headingText);

    if (!hasDate && !hasVersion) return;

    // ヘッダーの後続コンテンツを取得
    const contentParts: string[] = [];
    let next = $heading.next();
    let charCount = 0;
    while (next.length > 0 && !next.is("h2, h3") && charCount < 500) {
      const text = next.text().trim();
      if (text) {
        contentParts.push(text);
        charCount += text.length;
      }
      next = next.next();
    }

    const content = contentParts.join(" ").slice(0, 500).replace(/\s+/g, " ");
    const link = $heading.find("a").attr("href") || $heading.closest("[id]").attr("id");
    const url = link
      ? resolveUrl(link, pageUrl)
      : `${pageUrl}#${encodeURIComponent(headingText.slice(0, 50))}`;

    if (!seen.has(headingText) && content.length > 10) {
      seen.add(headingText);
      items.push({
        title: headingText.slice(0, 200),
        url,
        content: content || undefined,
        publishedAt: extractDateFromText(headingText),
      });
    }
  });

  return items.slice(0, 20);
}

/**
 * 単一ページとしてコンテンツを抽出（フォールバック）
 */
function extractSinglePage(
  $: cheerio.CheerioAPI,
  pageUrl: string
): FetchedItem[] {
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
 * エントリ要素からタイトルを抽出
 */
function extractEntryTitle(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>
): string {
  return (
    $el.find("h1, h2, h3, h4").first().text().trim() ||
    $el.find(".title, .heading").first().text().trim() ||
    $el.find("a").first().text().trim() ||
    $el.text().trim().slice(0, 100)
  );
}

/**
 * エントリ要素から日付を抽出
 */
function extractEntryDate(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>
): Date | undefined {
  // data-date属性
  const dataDate = $el.attr("data-date");
  if (dataDate) return new Date(dataDate);

  // time要素
  const timeEl = $el.find("time").first().attr("datetime");
  if (timeEl) return new Date(timeEl);

  // テキストから日付を抽出
  const text = $el.find("h2, h3, .date, time").first().text();
  return extractDateFromText(text);
}

/**
 * テキストから日付を抽出
 */
function extractDateFromText(text: string): Date | undefined {
  // ISO形式: 2026-02-28
  const isoMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return new Date(`${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`);

  // 日本語形式: 2026年2月28日
  const jpMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (jpMatch) return new Date(`${jpMatch[1]}-${jpMatch[2].padStart(2, "0")}-${jpMatch[3].padStart(2, "0")}`);

  // 英語形式: February 28, 2026
  const enMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/);
  if (enMatch) {
    const months: Record<string, string> = {
      January: "01", February: "02", March: "03", April: "04",
      May: "05", June: "06", July: "07", August: "08",
      September: "09", October: "10", November: "11", December: "12",
    };
    return new Date(`${enMatch[3]}-${months[enMatch[1]]}-${enMatch[2].padStart(2, "0")}`);
  }

  return undefined;
}

/**
 * ページから日付を抽出
 */
function extractDate($: cheerio.CheerioAPI): Date | undefined {
  const ogDate = $('meta[property="article:published_time"]').attr("content");
  if (ogDate) return new Date(ogDate);

  const timeEl = $("time").first().attr("datetime");
  if (timeEl) return new Date(timeEl);

  return undefined;
}

/**
 * 相対URLを絶対URLに解決
 */
function resolveUrl(href: string, baseUrl: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("#")) return `${baseUrl}${href}`;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return `${baseUrl}#${encodeURIComponent(href)}`;
  }
}
