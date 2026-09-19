"use client";

import { useEffect, useState } from "react";
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
  verifiedCount: number;
  instantBookingCount: number;
  /** Optional: number of listings matching the current filters (shown in the mobile "Show" button) */
  resultsCount?: number;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 whitespace-nowrap border px-3.5 py-2 text-sm transition-colors lg:py-1.5 lg:text-xs ${
        active
          ? "border-ink bg-ink text-cream"
          : "border-ink/10 bg-white text-ink hover:border-ink/30"
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
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="mb-1.5 flex items-center gap-2.5 py-1.5 text-sm text-ink/80 lg:mb-2.5 lg:gap-2 lg:py-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-wine lg:h-3.5 lg:w-3.5"
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
  verifiedCount,
  instantBookingCount,
  onChange,
  onReset,
  showReset = false,
}: FieldsProps) {
  const toggleAmenity = (key: string, checked: boolean) => {
    const next = checked
      ? [...filters.amenities, key]
      : filters.amenities.filter((a) => a !== key);
    onChange({ amenities: next });
  };

  // text-base on mobile stops iOS Safari from zooming in when an input is focused
  const inputClass =
    "w-full border border-ink/10 bg-white px-2.5 py-2.5 text-base text-ink lg:py-2 lg:text-sm";

  return (
    <>
      {/* Price */}
      <div className="border-b border-ink/10 py-5 first:pt-0">
        <h3 className="mb-3.5 text-sm font-semibold text-ink">Price per night (KES)</h3>
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
      <div className="border-b border-ink/10 py-5">
        <h3 className="mb-3.5 text-sm font-semibold text-ink">Property type</h3>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((type) => (
            <Pill
              key={type}
              label={type}
              active={filters.propertyType === type}
              onClick={() =>
                onChange({ propertyType: filters.propertyType === type ? null : type })
              }
            />
          ))}
        </div>
      </div>

      {/* Bedrooms */}
      <div className="border-b border-ink/10 py-5">
        <h3 className="mb-3.5 text-sm font-semibold text-ink">Bedrooms</h3>
        <div className="flex flex-wrap gap-2">
          {BEDROOM_OPTIONS.map((b) => (
            <Pill
              key={b}
              label={b}
              active={filters.bedrooms === b}
              onClick={() => onChange({ bedrooms: filters.bedrooms === b ? null : b })}
            />
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div className="border-b border-ink/10 py-5">
        <h3 className="mb-3.5 text-sm font-semibold text-ink">Amenities</h3>
        {amenityOptions.map((a) => (
          <CheckRow
            key={a.key}
            label={a.label}
            count={a.count}
            checked={filters.amenities.includes(a.key)}
            onChange={(checked) => toggleAmenity(a.key, checked)}
          />
        ))}
      </div>

      {/* Host */}
      <div className="border-b border-ink/10 py-5">
        <h3 className="mb-3.5 text-sm font-semibold text-ink">Host</h3>
        <CheckRow
          label="Verified hosts only"
          count={verifiedCount}
          checked={filters.verifiedOnly}
          onChange={(checked) => onChange({ verifiedOnly: checked })}
        />
        <CheckRow
          label="Instant booking"
          count={instantBookingCount}
          checked={filters.instantBooking}
          onChange={(checked) => onChange({ instantBooking: checked })}
        />
      </div>

      {/* Rating */}
      <div className="py-5">
        <h3 className="mb-3.5 text-sm font-semibold text-ink">Guest rating</h3>
        {RATING_OPTIONS.map((r) => (
          <CheckRow
            key={r.key}
            label={r.label}
            checked={filters.minRating === (r.key === "any" ? null : Number(r.key))}
            onChange={() =>
              onChange({ minRating: r.key === "any" ? null : Number(r.key) })
            }
          />
        ))}
        {showReset && (
          <button
            onClick={onReset}
            className="mt-2 text-sm text-wine underline underline-offset-2"
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
  verifiedCount,
  instantBookingCount,
  resultsCount,
  onChange,
  onReset,
}: FilterSidebarProps) {
  const [open, setOpen] = useState(false);

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
    (filters.verifiedOnly ? 1 : 0) +
    (filters.instantBooking ? 1 : 0) +
    (filters.minRating ? 1 : 0);

  const showLabel =
    resultsCount === undefined
      ? "Show results"
      : `Show ${resultsCount} ${resultsCount === 1 ? "stay" : "stays"}`;

  const fieldProps = {
    filters,
    amenityOptions,
    verifiedCount,
    instantBookingCount,
    onChange,
    onReset,
  };

  return (
    <>
      {/* ---------- Mobile / tablet: compact bar (hidden on lg+) ---------- */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="flex shrink-0 items-center gap-2 border border-ink bg-white px-3.5 py-2 text-sm font-medium text-ink"
        >
          <SlidersIcon />
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center bg-ink px-1 text-xs text-cream">
              {activeCount}
            </span>
          )}
        </button>

        {/* Quick-access property type chips so common filtering needs no sheet */}
        {PROPERTY_TYPES.map((type) => (
          <Pill
            key={type}
            label={type}
            active={filters.propertyType === type}
            onClick={() =>
              onChange({ propertyType: filters.propertyType === type ? null : type })
            }
          />
        ))}
      </div>

      {/* ---------- Mobile / tablet: bottom sheet (hidden on lg+) ---------- */}
      {open && (
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
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col bg-cream">
            <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Filters</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="-mr-2 p-2 text-ink"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-2">
              <FilterFields {...fieldProps} />
            </div>

            <div className="flex items-center gap-4 border-t border-ink/10 bg-cream px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                onClick={onReset}
                className="text-sm text-wine underline underline-offset-2"
              >
                Clear all
              </button>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto bg-ink px-6 py-3 text-sm font-medium text-cream"
              >
                {showLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Desktop: original sticky sidebar (lg+) ---------- */}
      <aside className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] self-start overflow-y-auto lg:block">
        <FilterFields {...fieldProps} showReset />
      </aside>
    </>
  );
}