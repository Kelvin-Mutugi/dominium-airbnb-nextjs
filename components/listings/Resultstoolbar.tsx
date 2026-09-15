"use client";

export type SortOption =
  | "recommended"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "newest";

export type ViewMode = "list" | "map";

interface ResultsToolbarProps {
  sort: SortOption;
  view: ViewMode;
  onSortChange: (sort: SortOption) => void;
  onViewChange: (view: ViewMode) => void;
}

const SORT_LABELS: Record<SortOption, string> = {
  recommended: "Sort: Recommended",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  rating: "Highest rated",
  newest: "Newest",
};

export default function ResultsToolbar({
  sort,
  view,
  onSortChange,
  onViewChange,
}: ResultsToolbarProps) {
  return (
    <div className="mb-5 flex items-center justify-end gap-4">
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="border border-ink/10 bg-white px-3 py-2 text-sm text-ink"
      >
        {Object.entries(SORT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <div className="flex border border-ink/10">
        {(["list", "map"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewChange(mode)}
            className={`px-3 py-2 text-xs capitalize ${
              view === mode ? "bg-ink text-cream" : "bg-white text-ink"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}