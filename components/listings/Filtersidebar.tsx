"use client";

import { useEffect, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { FilterState, AmenityOption } from "@/types/types";

const PROPERTY_TYPES = ["Apartment", "Cottage", "House", "Studio", "Villa"];
const BEDROOM_OPTIONS = ["Any", "1", "2", "3", "4+"];
const RATING_OPTIONS = [
  { key: "4.5", label: "4.5+" },
  { key: "4.0", label: "4.0+" },
  { key: "any", label: "Any rating" },
];

interface FilterSidebarProps {
  filters: FilterState;
  amenityOptions: AmenityOption[];
  groupStayCount: number;
  instantBookingCount: number;
  petFriendlyCount: number;
  /** Optional: number of listings matching the current filters (shown in the mobile "Show" button) */
  resultsCount?: number;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  soft?: boolean;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Pill({
  label,
  active,
  onClick,
  soft = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  soft?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm transition-all lg:py-1.5 lg:text-xs ${soft
        ? active
          ? "border border-neutral-800 bg-neutral-800 font-semibold text-white"
          : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500 hover:bg-neutral-100"
        : active
          ? "border border-ink bg-ink text-cream"
          : "border border-ink/10 bg-white text-ink hover:border-ink/30"
      }`}
    >
      {label}
    </button>
  );
}

function CheckRow({
  label,
  count,
  checked,
  onChange,
  soft = false,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
  soft?: boolean;
}) {
  return (
    <label className={`mb-1.5 flex items-center gap-2.5 py-1.5 text-sm lg:mb-2.5 lg:gap-2 lg:py-0 ${soft ? "text-[#555555]" : "text-ink/80"}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`h-4 w-4 lg:h-3.5 lg:w-3.5 ${soft ? "accent-[#666666]" : "accent-wine"}`}
      />
      <span>{label}</span>
      {typeof count === "number" && (
        <span className="ml-auto text-xs text-ink/40">{count}</span>
      )}
    </label>
  );
}

function SlidersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The actual filter fields (shared by desktop sidebar + mobile sheet) */
/* ------------------------------------------------------------------ */

type FieldsProps = Omit<FilterSidebarProps, "resultsCount"> & {
  showReset?: boolean;
};

function FilterFields({
  filters,
  amenityOptions,
  groupStayCount,
  instantBookingCount,
  petFriendlyCount,
  onChange,
  onReset,
  showReset = false,
  soft = false,
}: FieldsProps) {
  const toggleAmenity = (key: string, checked: boolean) => {
    const next = checked
      ? [...filters.amenities, key]
      : filters.amenities.filter((a) => a !== key);
    onChange({ amenities: next });
  };
  const moreFiltersBorder = soft ? "border-[#e2e2e2]" : "border-ink/10";

  // text-base on mobile stops iOS Safari from zooming in when an input is focused
  const inputClass = `w-full rounded-md px-3 py-2.5 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-500 lg:py-2 lg:text-sm ${soft ? "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400" : "border border-ink/10 bg-white text-ink"}`;

  return (
    <>
      {/* Price */}
      <div className={`border-b py-5 first:pt-0 ${soft ? "border-[#e2e2e2]" : "border-ink/10"}`}>
        <h3 className={`mb-3.5 text-sm font-semibold ${soft ? "text-[#373737]" : "text-ink"}`}>Price per night (KES)</h3>
        <div className="mb-2.5 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={filters.minPrice}
            onChange={(e) => onChange({ minPrice: Number(e.target.value) })}
            placeholder="Min"
            aria-label="Minimum price per night"
            className={inputClass}
          />
          <span className="text-ink/40">—</span>
          <input
            type="number"
            inputMode="numeric"
            value={filters.maxPrice}
            onChange={(e) => onChange({ maxPrice: Number(e.target.value) })}
            placeholder="Max"
            aria-label="Maximum price per night"
            className={inputClass}
          />
        </div>
      </div>

      {/* Property type */}
      <div className={`border-b py-5 ${soft ? "border-[#e2e2e2]" : "border-ink/10"}`}>
        <h3 className={`mb-3.5 text-sm font-semibold ${soft ? "text-[#373737]" : "text-ink"}`}>Property type</h3>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((type) => (
            <Pill
              key={type}
              label={type}
              active={filters.propertyType === type}
              soft={soft}
              onClick={() =>
                onChange({ propertyType: filters.propertyType === type ? null : type })
              }
            />
          ))}
        </div>
      </div>

      {/* Bedrooms */}
      <div className={`border-b py-5 ${soft ? "border-[#e2e2e2]" : "border-ink/10"}`}>
        <h3 className={`mb-3.5 text-sm font-semibold ${soft ? "text-[#373737]" : "text-ink"}`}>Bedrooms</h3>
        <div className="flex flex-wrap gap-2">
          {BEDROOM_OPTIONS.map((b) => (
            <Pill
              key={b}
              label={b}
              active={filters.bedrooms === b}
              soft={soft}
              onClick={() => onChange({ bedrooms: filters.bedrooms === b ? null : b })}
            />
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div className={`border-b py-5 ${soft ? "border-[#e2e2e2]" : "border-ink/10"}`}>
        <h3 className={`mb-3.5 text-sm font-semibold ${soft ? "text-[#373737]" : "text-ink"}`}>Amenities</h3>
        {amenityOptions.map((a) => (
          <CheckRow
            key={a.key}
            label={a.label}
            count={a.count}
            checked={filters.amenities.includes(a.key)}
            onChange={(checked) => toggleAmenity(a.key, checked)}
            soft={soft}
          />
        ))}
      </div>

      {/* Guest capacity */}
      <div className={`border-b py-5 ${soft ? "border-[#e2e2e2]" : "border-ink/10"}`}>
        <h3 className={`mb-3.5 text-sm font-semibold ${soft ? "text-[#373737]" : "text-ink"}`}>Guest capacity</h3>
        <CheckRow
          label="Sleeps 4+ guests"
          count={groupStayCount}
          checked={filters.groupStayOnly}
          onChange={(checked) => onChange({ groupStayOnly: checked })}
          soft={soft}
        />
        <CheckRow
          label="Instant booking"
          count={instantBookingCount}
          checked={filters.instantBooking}
          onChange={(checked) => onChange({ instantBooking: checked })}
          soft={soft}
        />
      </div>

      <details className={`border-b py-5 ${moreFiltersBorder}`}>
        <summary
          className={`cursor-pointer text-sm font-semibold ${soft ? "text-[#373737]" : "text-ink"}`}
        >
          More filters
        </summary>
        <div className="pt-3">
          <CheckRow
            label="Pet-friendly"
            count={petFriendlyCount}
            checked={filters.petFriendly}
            onChange={(checked) => onChange({ petFriendly: checked })}
            soft={soft}
          />
        </div>
      </details>

      {/* Rating */}
      <div className="py-5">
        <h3 className={`mb-3.5 text-sm font-semibold ${soft ? "text-[#373737]" : "text-ink"}`}>Guest rating</h3>
        {RATING_OPTIONS.map((r) => (
          <CheckRow
            key={r.key}
            label={r.label}
            checked={filters.minRating === (r.key === "any" ? null : Number(r.key))}
            soft={soft}
            onChange={() =>
              onChange({ minRating: r.key === "any" ? null : Number(r.key) })
            }
          />
        ))}
        {showReset && (
          <button
            onClick={onReset}
            className={`mt-2 text-sm underline underline-offset-2 ${soft ? "text-[#555555]" : "text-wine"}`}
          >
            Reset filters
          </button>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function FilterSidebar({
  filters,
  amenityOptions,
  groupStayCount,
  instantBookingCount,
  petFriendlyCount,
  resultsCount,
  onChange,
  onReset,
  soft = false,
  mobileOnly = false,
  desktopOnly = false,
}: FilterSidebarProps) {
  const [open, setOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);

  // Lock page scroll + close on Escape while the mobile sheet is open
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Number shown on the "Filters" button badge.
  // NOTE: adjust the price check if your default minPrice / maxPrice aren't 0.
  const activeCount =
    (filters.minPrice > 0 ? 1 : 0) +
    (filters.propertyType ? 1 : 0) +
    (filters.bedrooms && filters.bedrooms !== "Any" ? 1 : 0) +
    filters.amenities.length +
    (filters.petFriendly ? 1 : 0) +
    (filters.groupStayOnly ? 1 : 0) +
    (filters.instantBooking ? 1 : 0) +
    (filters.minRating ? 1 : 0);

  const showLabel =
    resultsCount === undefined
      ? "Show results"
      : `Show ${resultsCount} ${resultsCount === 1 ? "stay" : "stays"}`;

  const fieldProps = {
    filters,
    amenityOptions,
    groupStayCount,
    instantBookingCount,
    petFriendlyCount,
    onChange,
    onReset,
    soft,
  };

  return (
    <>
      {/* ---------- Mobile / tablet: compact bar (hidden on lg+) ---------- */}
      {!desktopOnly && <div className="flex items-center gap-2 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label="Filters"
          title="Filters"
          className={mobileOnly
            ? `relative flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${soft ? "border border-[#dedede] bg-white text-[#484848] hover:bg-[#f5f5f5]" : "border border-ink bg-white text-ink"}`
            : `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${soft ? "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-500 hover:bg-neutral-100" : "border border-ink bg-white text-ink"}`}
        >
          <SlidersIcon />
          {!mobileOnly && "Filters"}
          {!mobileOnly && activeCount > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center bg-ink px-1 text-xs text-cream">
              {activeCount}
            </span>
          )}
          {mobileOnly && activeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#444444] px-1 text-[10px] text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>}

      {/* ---------- Mobile / tablet: bottom sheet (hidden on lg+) ---------- */}
      {!desktopOnly && open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div className={`absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col ${soft ? "bg-[#f5f5f5]" : "bg-cream"}`}>
            <div className={`flex items-center justify-between border-b px-5 py-4 ${soft ? "border-[#e1e1e1]" : "border-ink/10"}`}>
              <h2 className="text-base font-semibold text-[#303030]">Filters</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="-mr-2 p-2 text-[#555555]"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-2">
              <FilterFields {...fieldProps} />
            </div>

            <div className={`flex items-center gap-4 border-t px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${soft ? "border-[#e1e1e1] bg-[#f5f5f5]" : "border-ink/10 bg-cream"}`}>
              <button
                onClick={onReset}
                className={`text-sm underline underline-offset-2 ${soft ? "text-[#555555]" : "text-wine"}`}
              >
                Clear all
              </button>
              <button
                onClick={() => setOpen(false)}
                className={`ml-auto rounded-md px-6 py-3 text-sm font-semibold transition-colors ${soft ? "border border-neutral-800 bg-neutral-800 text-white hover:bg-neutral-700" : "bg-ink text-cream"}`}
              >
                {showLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Desktop: collapsible full-width filter panel ---------- */}
      {!mobileOnly && <section className="hidden lg:block">
        <button
          type="button"
          onClick={() => setDesktopOpen((current) => !current)}
          aria-expanded={desktopOpen}
          aria-controls="desktop-listing-filters"
          className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${soft ? "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-500 hover:bg-neutral-100" : "border border-ink/15 bg-white text-ink hover:bg-cream"}`}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-xs text-cream">
              {activeCount}
            </span>
          )}
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`transition-transform ${desktopOpen ? "rotate-180" : ""}`}
          />
        </button>
        {desktopOpen && (
          <div
            id="desktop-listing-filters"
            className={`mt-3 grid grid-cols-3 gap-x-8 rounded-md px-6 py-2 ${soft ? "border border-neutral-200 bg-neutral-50" : "border border-ink/10 bg-white shadow-sm"}`}
          >
            <FilterFields {...fieldProps} showReset />
          </div>
        )}
      </section>}
    </>
  );
}