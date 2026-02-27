import { FetchedItem } from "./rss";

const GITHUB_API_BASE = "https://api.github.com";

interface GitHubRelease {
  name: string;
  tag_name: string;
  html_url: string;
  body: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
}

/**
 * GitHub REST API でリリース情報を取得
 * レート制限: 未認証60回/時、認証5000回/時
 */
export async function fetchGitHubReleases(
  repoUrl: string
): Promise<FetchedItem[]> {
  // "https://github.com/owner/repo" → "owner/repo"
  const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  }
  const repo = match[1];

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "aiaiai-ingestion/1.0",
  };

  // 環境変数からトークンがあれば使う（レート制限緩和）
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${GITHUB_API_BASE}/repos/${repo}/releases?per_page=10`;

  const response = await fetchWithBackoff(url, { headers });
  if (!response.ok) {
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  const releases: GitHubRelease[] = await response.json();

  return releases
    .filter((r) => !r.draft)
    .map((release) => ({
      title: release.name || release.tag_name,
      url: release.html_url,
      content: release.body
        ? release.body.slice(0, 500)
        : undefined, // 全文転載回避: 500文字制限
      publishedAt: new Date(release.published_at),
    }));
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
      const response = await fetch(url, options);

      // レート制限チェック
      if (response.status === 403 || response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.pow(2, attempt) * 1000;

        if (attempt < maxRetries) {
          await sleep(waitMs);
          continue;
        }
      }

      return response;
    } catch (error) {
      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 1000);
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
