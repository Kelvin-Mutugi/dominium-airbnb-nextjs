"use client";

import { List, Map } from "lucide-react";

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
  soft?: boolean;
}

const SORT_LABELS: Record<SortOption, string> = {
  recommended: "Recommended",
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
  soft = false,
}: ResultsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <label htmlFor="listing-sort" className="text-xs font-medium text-neutral-600">
        Sort
      </label>
      <select
        id="listing-sort"
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className={`h-9 max-w-44 rounded-md px-2.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-500 ${soft ? "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400" : "border border-ink/10 bg-white text-ink"}`}
      >
        {Object.entries(SORT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <div className={`flex rounded-md border p-0.5 ${soft ? "border-neutral-300 bg-neutral-100" : "border-ink/10"}`} role="group" aria-label="Listing view">
        {(["list", "map"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={view === mode}
            onClick={() => onViewChange(mode)}
            className={`inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs capitalize transition-colors ${
              view === mode
                ? soft ? "bg-neutral-800 text-white" : "bg-ink text-cream"
                : soft ? "text-neutral-600 hover:bg-white hover:text-neutral-900" : "bg-white text-ink"
            }`}
          >
            {mode === "list" ? <List size={14} aria-hidden="true" /> : <Map size={14} aria-hidden="true" />}
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}