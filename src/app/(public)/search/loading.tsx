export default function SearchLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-24 rounded bg-gray-200" />
      <div className="flex gap-2">
        <div className="h-10 flex-1 rounded-md bg-gray-200" />
        <div className="h-10 w-20 rounded-md bg-gray-200" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded bg-gray-100" />
        <div className="h-6 w-16 rounded bg-gray-100" />
        <div className="h-6 w-18 rounded bg-gray-100" />
      </div>
    </div>
  );
}
