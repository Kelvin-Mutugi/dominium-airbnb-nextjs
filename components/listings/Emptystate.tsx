interface EmptyStateProps {
  title?: string;
  message?: string;
  onResetFilters?: () => void;
}

export default function EmptyState({
  title = "No stays match these filters",
  message = "Try widening your price range or removing an amenity filter.",
  onResetFilters,
}: EmptyStateProps) {
  return (
    <div className="py-20 text-center text-ink/60">
      <h3 className="mb-2 font-serif text-xl text-ink">{title}</h3>
      <p className="mb-4">{message}</p>
      {onResetFilters && (
        <button
          onClick={onResetFilters}
          className="border-b border-wine text-sm font-medium text-wine"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}