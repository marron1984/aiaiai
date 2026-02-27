"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-gray-200">Error</h1>
      <p className="mt-4 text-lg text-gray-600">
        エラーが発生しました
      </p>
      <p className="mt-2 text-sm text-gray-400">{error.message}</p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        再試行
      </button>
    </div>
  );
}
