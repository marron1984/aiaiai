"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20">
      <h1 className="text-2xl font-bold text-gray-900">
        データベース接続エラー
      </h1>
      <p className="mt-3 max-w-lg text-center text-sm text-gray-500">
        データベースに接続できません。Vercelダッシュボードで Postgres
        が正しく設定されていることを確認してください。
      </p>
      <div className="mt-4 rounded-lg bg-gray-50 p-4 text-left text-xs text-gray-600">
        <p className="font-semibold">チェックリスト:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Vercel Storage から Postgres を追加済みか</li>
          <li>環境変数 POSTGRES_PRISMA_URL が設定されているか</li>
          <li>環境変数 POSTGRES_URL_NON_POOLING が設定されているか</li>
          <li>再デプロイ後にマイグレーションが実行されたか</li>
        </ul>
      </div>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        再試行
      </button>
    </div>
  );
}
