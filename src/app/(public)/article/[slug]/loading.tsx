export default function ArticleLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6">
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div className="space-y-3">
        <div className="h-10 w-full rounded bg-gray-200" />
        <div className="h-10 w-3/4 rounded bg-gray-200" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded-full bg-gray-200" />
        <div className="h-6 w-24 rounded-full bg-gray-200" />
        <div className="h-6 w-16 rounded-full bg-gray-200" />
      </div>
      <div className="space-y-4 rounded-lg border border-gray-200 p-6">
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 w-4/5 rounded bg-gray-100" />
        </div>
      </div>
      <div className="space-y-4 rounded-lg border border-gray-200 p-6">
        <div className="h-5 w-40 rounded bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 w-2/3 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
