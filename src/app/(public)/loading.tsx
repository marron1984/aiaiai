export default function PublicLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-gray-200" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex gap-2">
              <div className="h-5 w-16 rounded-full bg-gray-200" />
              <div className="h-5 w-20 rounded-full bg-gray-200" />
            </div>
            <div className="h-6 w-3/4 rounded bg-gray-200" />
            <div className="mt-3 space-y-2">
              <div className="h-4 rounded bg-gray-100" />
              <div className="h-4 w-5/6 rounded bg-gray-100" />
            </div>
            <div className="mt-3 flex justify-between">
              <div className="h-3 w-24 rounded bg-gray-100" />
              <div className="h-3 w-12 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
