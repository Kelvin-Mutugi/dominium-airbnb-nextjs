"use client";

export interface ActiveFilter {
  key: string;    // unique id so onRemove knows which one was clicked
  label: string;  // e.g. "KES 3,000 – 9,000"
}

interface ActiveFilterChipsProps {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  soft?: boolean;
}

export default function ActiveFilterChips({ filters, onRemove, onClearAll, soft = false }: ActiveFilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pb-5">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onRemove(f.key)}
          className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${soft ? "border-neutral-300 bg-neutral-100 text-neutral-700 hover:border-neutral-400 hover:bg-neutral-200" : "border-ink/10 bg-white text-ink hover:border-ink/30"}`}
        >
          {f.label}
          <span className="text-ink/40">✕</span>
        </button>
      ))}
      <button
        onClick={onClearAll}
        className={`px-2 py-1.5 text-xs underline underline-offset-2 ${soft ? "text-[#555555]" : "text-wine"}`}
      >
        Clear all
      </button>
    </div>
  );
}