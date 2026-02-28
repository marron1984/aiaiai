"use client";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDbError =
    error.message.includes("prisma") ||
    error.message.includes("connect") ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("P1001") ||
    error.message.includes("P1002") ||
    error.message.includes("database");

  return (
    <div className="flex flex-col items-center justify-center px-4 py-20">
      {isDbError ? (
        <>
          <div className="mb-4 text-5xl">🔧</div>
          <h1 className="text-2xl font-bold text-gray-900">
            ただいま準備中です
          </h1>
          <p className="mt-3 max-w-md text-center text-sm text-gray-500">
            データベースへの接続を確認しています。しばらくお待ちいただくか、管理者にお問い合わせください。
          </p>
        </>
      ) : (
        <>
          <h1 className="text-6xl font-bold text-gray-200">Error</h1>
          <p className="mt-4 text-lg text-gray-600">
            エラーが発生しました
          </p>
          <p className="mt-2 max-w-md text-center text-sm text-gray-400">
            {error.message}
          </p>
        </>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        再試行
      </button>
    </div>
  );
}
