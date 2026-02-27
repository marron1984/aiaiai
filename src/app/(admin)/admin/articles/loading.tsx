export default function ArticlesLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-32 rounded bg-gray-200" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
          >
            <div className="flex-1 space-y-2">
              <div className="h-5 w-2/3 rounded bg-gray-200" />
              <div className="h-4 w-1/4 rounded bg-gray-100" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 rounded bg-gray-200" />
              <div className="h-8 w-16 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
