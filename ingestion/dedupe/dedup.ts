import { normalizeUrl } from "../normalize/url";
import { tokenizeTitle, jaccardSimilarity } from "../normalize/title";

export interface DedupeCandidate {
  id: string;
  canonicalUrl: string;
  title: string;
  sourceType: string;
}

export interface DedupeResult {
  /** 重複グループ: 各グループの最初が代表 */
  clusters: DedupeCandidate[][];
  /** 重複なしのアイテム */
  unique: DedupeCandidate[];
}

// タイトル類似度の閾値（保守的に高めに設定）
const TITLE_SIMILARITY_THRESHOLD = 0.6;

// ソースタイプの優先度（代表決定用）
const SOURCE_PRIORITY: Record<string, number> = {
  OFFICIAL: 4,
  RSS: 3,
  GITHUB: 3,
  X: 1,
};

/**
 * 重複判定と統合
 *
 * 段階:
 * 1. 強一致: canonicalUrl一致
 * 2. 中一致: 正規化タイトル類似（Jaccard）
 * 代表決定: 公式 > 準一次 > 二次 > SNS
 */
export function deduplicateItems(items: DedupeCandidate[]): DedupeResult {
  const clusters: Map<string, DedupeCandidate[]> = new Map();
  const assigned = new Set<string>();

  // 1. 強一致: URL正規化で一致判定
  const urlMap = new Map<string, DedupeCandidate[]>();
  for (const item of items) {
    const normalizedUrl = normalizeUrl(item.canonicalUrl);
    const group = urlMap.get(normalizedUrl) || [];
    group.push(item);
    urlMap.set(normalizedUrl, group);
  }

  for (const [url, group] of urlMap) {
    if (group.length > 1) {
      const sorted = sortByPriority(group);
      clusters.set(url, sorted);
      for (const item of group) {
        assigned.add(item.id);
      }
    }
  }

  // 2. 中一致: タイトル類似度
  const unassigned = items.filter((item) => !assigned.has(item.id));
  const tokenized = unassigned.map((item) => ({
    item,
    tokens: tokenizeTitle(item.title),
  }));

  for (let i = 0; i < tokenized.length; i++) {
    if (assigned.has(tokenized[i].item.id)) continue;

    const group: DedupeCandidate[] = [tokenized[i].item];

    for (let j = i + 1; j < tokenized.length; j++) {
      if (assigned.has(tokenized[j].item.id)) continue;

      const similarity = jaccardSimilarity(
        tokenized[i].tokens,
        tokenized[j].tokens
      );

      if (similarity >= TITLE_SIMILARITY_THRESHOLD) {
        group.push(tokenized[j].item);
        assigned.add(tokenized[j].item.id);
      }
    }

    if (group.length > 1) {
      const sorted = sortByPriority(group);
      clusters.set(`title-${tokenized[i].item.id}`, sorted);
      assigned.add(tokenized[i].item.id);
    }
  }

  const unique = items.filter((item) => !assigned.has(item.id));

  return {
    clusters: Array.from(clusters.values()),
    unique,
  };
}

/**
 * ソース優先度でソート（代表が先頭）
 */
function sortByPriority(items: DedupeCandidate[]): DedupeCandidate[] {
  return [...items].sort((a, b) => {
    const priorityA = SOURCE_PRIORITY[a.sourceType] ?? 0;
    const priorityB = SOURCE_PRIORITY[b.sourceType] ?? 0;
    return priorityB - priorityA;
  });
}
