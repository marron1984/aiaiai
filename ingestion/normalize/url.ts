/**
 * URL正規化
 * - トラッキングパラメータ除去 (utm_*, fbclid, etc.)
 * - 末尾スラッシュ統一
 * - プロトコル統一 (http → https)
 * - フラグメント除去
 */
const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "ref",
  "source",
  "mc_cid",
  "mc_eid",
];

export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);

    // http → https
    if (url.protocol === "http:") {
      url.protocol = "https:";
    }

    // トラッキングパラメータ除去
    for (const param of TRACKING_PARAMS) {
      url.searchParams.delete(param);
    }

    // フラグメント除去
    url.hash = "";

    // 末尾スラッシュ統一（ルート以外は除去）
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    // 小文字化（ホスト部分のみ）
    let result = url.toString();

    // 空のクエリ文字列除去
    if (result.endsWith("?")) {
      result = result.slice(0, -1);
    }

    return result;
  } catch {
    return rawUrl;
  }
}
