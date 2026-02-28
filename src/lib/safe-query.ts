/**
 * DB接続エラーを安全にキャッチするラッパー
 * Vercel Postgres未設定時でもページがクラッシュしないようにする
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  fallback: T
): Promise<{ data: T; error: boolean }> {
  try {
    const data = await queryFn();
    return { data, error: false };
  } catch (e) {
    console.error("[DB Query Error]", e instanceof Error ? e.message : e);
    return { data: fallback, error: true };
  }
}
