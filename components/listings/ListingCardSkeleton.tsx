export default function ListingCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-1 gap-5 border-b border-ink/10 py-5 first:pt-0 sm:grid-cols-[260px_1fr]"
    >
      <div className="shimmer h-[180px] w-full" />

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-1 flex-col gap-2">
            <div className="shimmer h-5 w-3/5 rounded" />
            <div className="shimmer h-4 w-2/5 rounded" />
          </div>
          <div className="shimmer h-6 w-28 rounded" />
        </div>

        <div className="flex gap-2">
          <div className="shimmer h-7 w-16 rounded" />
          <div className="shimmer h-7 w-20 rounded" />
          <div className="shimmer h-7 w-14 rounded" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="shimmer h-4 w-full rounded" />
          <div className="shimmer h-4 w-4/5 rounded" />
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="shimmer h-4 w-24 rounded" />
          <div className="shimmer h-4 w-28 rounded" />
        </div>
      </div>
    </div>
  );
}