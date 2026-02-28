import { FetchedItem } from "./rss";

const X_API_BASE = "https://api.x.com/2";

interface XTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count: number;
  };
}

interface XUser {
  id: string;
  username: string;
  name: string;
  verified?: boolean;
}

interface XSearchResponse {
  data?: XTweet[];
  includes?: {
    users?: XUser[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

/**
 * X API v2 で投稿を検索取得
 * 規約遵守: API利用のみ、スクレイピング禁止
 * 速報補助として扱い、裏取り前は隔離ラベル付き
 */
export async function fetchXPosts(
  query: string,
  options?: { maxResults?: number }
): Promise<FetchedItem[]> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    throw new Error(
      "X_BEARER_TOKEN が設定されていません。X API v2 の Bearer Token を .env に設定してください。"
    );
  }

  const maxResults = Math.min(options?.maxResults || 20, 100);

  const params = new URLSearchParams({
    query: `${query} -is:retweet lang:ja`,
    max_results: String(maxResults),
    "tweet.fields": "created_at,author_id,public_metrics",
    expansions: "author_id",
    "user.fields": "username,name,verified",
  });

  const url = `${X_API_BASE}/tweets/search/recent?${params}`;

  const response = await fetchWithBackoff(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "User-Agent": "aiaiai-ingestion/1.0",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `X API error: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const data: XSearchResponse = await response.json();

  if (!data.data || data.data.length === 0) {
    return [];
  }

  // ユーザー情報のマップ
  const userMap = new Map<string, XUser>();
  if (data.includes?.users) {
    for (const user of data.includes.users) {
      userMap.set(user.id, user);
    }
  }

  return data.data.map((tweet) => {
    const user = userMap.get(tweet.author_id);
    const username = user?.username || "unknown";
    const displayName = user?.name || username;

    // タイトル: ユーザー名 + ツイートの先頭80文字
    const titleText = tweet.text.replace(/\n/g, " ").slice(0, 80);
    const title = `[X速報] ${displayName}: ${titleText}`;

    return {
      title,
      url: `https://x.com/${username}/status/${tweet.id}`,
      // 全文転載回避: 先頭300文字まで
      content: tweet.text.slice(0, 300),
      publishedAt: new Date(tweet.created_at),
    };
  });
}

/**
 * 公式アカウントの投稿を取得
 */
export async function fetchOfficialXPosts(
  username: string
): Promise<FetchedItem[]> {
  return fetchXPosts(`from:${username}`, { maxResults: 10 });
}

/**
 * AI関連トピックの投稿を検索
 */
export async function fetchAITopicXPosts(): Promise<FetchedItem[]> {
  const queries = [
    "(ChatGPT OR OpenAI) (アップデート OR 新機能 OR リリース OR 使い方)",
    "(Claude OR Anthropic) (アップデート OR 新機能 OR リリース OR 使い方)",
    "(Gemini OR Google AI) (アップデート OR 新機能 OR リリース OR 使い方)",
    "(生成AI OR LLM) (業務 OR 活用 OR 導入 OR ワークフロー)",
  ];

  const allItems: FetchedItem[] = [];

  for (const query of queries) {
    try {
      const items = await fetchXPosts(query, { maxResults: 10 });
      allItems.push(...items);
    } catch (error) {
      // 個別クエリの失敗は無視して続行
      console.warn(`X search failed for query "${query}":`, error);
    }
    // レート制限を考慮して間隔を空ける
    await sleep(1000);
  }

  return allItems;
}

/**
 * エクスポネンシャルバックオフ付きfetch
 */
async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(15000),
      });

      // レート制限チェック
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.pow(2, attempt + 1) * 1000;

        if (attempt < maxRetries) {
          await sleep(waitMs);
          continue;
        }
      }

      return response;
    } catch (error) {
      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt + 1) * 1000);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${url}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
