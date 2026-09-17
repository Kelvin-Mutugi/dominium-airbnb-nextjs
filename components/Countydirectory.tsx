import React, { useMemo, useState } from "react";
import {
  MapPin,
  Search,
  ArrowRight,
  ChevronDown,
  Clock,
  Building2,
  Waves,
  Droplet,
  Anchor,
  Sun,
  Fish,
  Bird,
  PawPrint,
  Wheat,
  Mountain,
  Trees,
  Leaf,
  type LucideIcon,
} from "lucide-react";
import { COUNTIES, type CountyInfo, type IconKey } from "./counties";

/**
 * CountyDirectory
 * "Explore accommodation by county" — a compact, sortable/searchable
 * directory of all 47 Kenyan counties, with a small attraction thumbnail
 * per card. County data lives in ./counties.ts.
 *
 * Requires: tailwindcss, lucide-react
 */

const ICONS: Record<IconKey, LucideIcon> = {
  building: Building2,
  waves: Waves,
  droplet: Droplet,
  anchor: Anchor,
  sun: Sun,
  fish: Fish,
  bird: Bird,
  paw: PawPrint,
  wheat: Wheat,
  mountain: Mountain,
  trees: Trees,
  leaf: Leaf,
};

const FALLBACK_GRADIENT = "from-slate-200 to-slate-300";

const REGIONS = [
  "All regions",
  ...Array.from(new Set(COUNTIES.map((c) => c.region))).sort(),
];

type SortKey = "listings" | "name" | "region";

const SORT_LABELS: Record<SortKey, string> = {
  listings: "Most listings",
  name: "Name, A–Z",
  region: "Region",
};

// Roughly two rows at the widest breakpoint (6 columns × 2 rows).
// Fewer columns on smaller screens just means more (shorter) rows —
// still a single bounded, predictable chunk to scan before expanding.
const INITIAL_VISIBLE = 12;

export default function CountyDirectory() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All regions");
  const [sortKey, setSortKey] = useState<SortKey>("listings");
  const [expanded, setExpanded] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = COUNTIES.filter((c) => {
      const matchesQuery = c.name.toLowerCase().includes(q);
      const matchesRegion = region === "All regions" || c.region === region;
      return matchesQuery && matchesRegion;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "region") {
        return (
          a.region.localeCompare(b.region) || a.name.localeCompare(b.name)
        );
      }
      return (b.listings ?? -1) - (a.listings ?? -1);
    });

    return sorted;
  }, [query, region, sortKey]);

  // Collapse back to two rows whenever the filtered set changes, so
  // "View more" always refers to the list currently on screen.
  React.useEffect(() => {
    setExpanded(false);
  }, [query, region, sortKey]);

  const visibleResults = expanded
    ? results
    : results.slice(0, INITIAL_VISIBLE);
  const hiddenCount = results.length - visibleResults.length;

  const liveCount = useMemo(
    () => COUNTIES.filter((c) => c.listings !== null).length,
    []
  );

  return (
    <section className="w-full bg-white px-[6%] pt-14" id="explore_by_county">
      <div>
        {/* Header */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-[28px] font-bold text-[#36454F]">
              Explore accommodation by county
            </h2>
            {/* <p className="mt-3 text-base text-slate-500">
              Browse short-term rental coverage across Kenya's 47 counties
              and find your next destination.
            </p> */}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <label className="relative block sm:w-56">
              <span className="sr-only">Search counties</span>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search counties"
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-100"
              />
            </label>

            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-label="Filter by region"
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-100 sm:w-40"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="Sort counties"
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-100 sm:w-44"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Result summary */}
        <p className="mt-6 text-sm text-slate-500">
          {results.length} of {COUNTIES.length} counties
          {region !== "All regions" ? ` in ${region}` : ""} · {liveCount} have
          live listings
        </p>

        {/* Grid — narrower cards, more per row */}
        {results.length > 0 ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {visibleResults.map((county) => (
                <CountyCard key={county.name} county={county} />
              ))}
            </div>

            {hiddenCount > 0 && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-pink-300 hover:text-pink-700"
                >
                  View {hiddenCount} more{" "}
                  {hiddenCount === 1 ? "county" : "counties"}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )}

            {expanded && results.length > INITIAL_VISIBLE && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
                >
                  Show less
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
            <p className="text-base font-semibold text-slate-800">
              No counties match "{query}"
            </p>
            <p className="text-sm text-slate-500">
              Try a different name, or clear your search and region filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setRegion("All regions");
              }}
              className="mt-2 rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pink-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function CountyCard({ county }: { county: CountyInfo }) {
  const hasData = county.listings !== null;
  const Icon = county.iconKey ? ICONS[county.iconKey] : MapPin;
  const gradient = county.gradient ?? FALLBACK_GRADIENT;

  return (
    <a
      href="#"
      aria-disabled={!hasData}
      onClick={(e) => {
        if (!hasData) e.preventDefault();
      }}
      className={[
        "group flex flex-col overflow-hidden rounded-xl border bg-white transition-all",
        hasData
          ? "border-slate-200 hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-lg hover:shadow-pink-100/60"
          : "cursor-default border-slate-100",
      ].join(" ")}
    >
      {/* Thumbnail */}
      <div
        className={[
          "relative h-20 w-full shrink-0 bg-gradient-to-br sm:h-24",
          hasData ? gradient : FALLBACK_GRADIENT,
        ].join(" ")}
      >
        {county.imageUrl ? (
          <img
            src={county.imageUrl}
            alt={county.attraction ?? county.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon
              className={hasData ? "h-6 w-6 text-white/70" : "h-6 w-6 text-slate-400"}
            />
          </div>
        )}

        {hasData && county.attraction && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1 pt-4">
            <p className="truncate text-[11px] font-medium text-white">
              {county.attraction}
            </p>
          </div>
        )}

        {!hasData && (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            <Clock className="h-2.5 w-2.5" />
            Soon
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3">
        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <MapPin className="h-3 w-3" />
          {county.region}
        </span>

        <h3
          className={[
            "mt-1 truncate text-sm font-bold",
            hasData ? "text-slate-900" : "text-slate-500",
          ].join(" ")}
        >
          {county.name}
        </h3>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className={hasData ? "text-xs text-slate-500" : "text-xs text-slate-400"}>
            {hasData
              ? `${county.listings!.toLocaleString("en-KE")} listings`
              : "Not listed yet"}
          </span>
          <ArrowRight
            className={[
              "h-3.5 w-3.5 transition-transform",
              hasData
                ? "text-pink-600 group-hover:translate-x-0.5"
                : "text-slate-300",
            ].join(" ")}
          />
        </div>
      </div>
    </a>
  );
}