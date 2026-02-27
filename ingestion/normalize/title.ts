/**
 * タイトル正規化
 * - 絵文字除去
 * - 全角→半角（英数字・記号）
 * - 連続空白の圧縮
 * - 前後空白のトリム
 */

// 絵文字パターン
const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{FE0F}]/gu;

export function normalizeTitle(rawTitle: string): string {
  let title = rawTitle;

  // 絵文字除去
  title = title.replace(EMOJI_REGEX, "");

  // 全角英数字→半角
  title = title.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0)
  );

  // 全角スペース→半角
  title = title.replace(/\u3000/g, " ");

  // 連続空白の圧縮
  title = title.replace(/\s+/g, " ");

  // トリム
  title = title.trim();

  return title;
}

/**
 * タイトルのトークン化（重複判定用）
 */
export function tokenizeTitle(title: string): Set<string> {
  const normalized = normalizeTitle(title).toLowerCase();
  // 英単語と日本語文字で分割
  const tokens = normalized.split(/[\s\-_:：・/|【】「」\[\]()（）]+/);
  return new Set(tokens.filter((t) => t.length > 0));
}

/**
 * Jaccard類似度（タイトル比較用）
 */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}
