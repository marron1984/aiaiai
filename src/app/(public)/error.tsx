"use client";

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20">
      <h1 className="text-2xl font-bold text-gray-900">
        ただいま準備中です
      </h1>
      <p className="mt-3 max-w-md text-center text-sm text-gray-500">
        サービスの準備を進めています。しばらくお待ちいただくか、管理者にお問い合わせください。
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        再試行
      </button>
    </div>
  );
}
