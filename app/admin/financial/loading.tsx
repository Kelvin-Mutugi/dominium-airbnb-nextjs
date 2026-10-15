export default function FinancialLoading() {
  return (
    <div aria-label="Loading finance data" className="animate-pulse space-y-6">
      <div>
        <div className="h-7 w-56 rounded bg-gray-200" />
        <div className="mt-2 h-4 max-w-xl rounded bg-gray-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 rounded-xl border bg-white" />
        ))}
      </div>
      <div className="h-80 rounded-xl border bg-white" />
    </div>
  );
}
