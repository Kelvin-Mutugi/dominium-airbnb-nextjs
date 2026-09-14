"use client";

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
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}

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
      className={`border px-3.5 py-1.5 text-xs transition-colors ${
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
    <label className="mb-2.5 flex items-center gap-2 text-sm text-ink/80">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-wine"
      />
      <span>{label}</span>
      {typeof count === "number" && (
        <span className="ml-auto text-xs text-ink/40">{count}</span>
      )}
    </label>
  );
}

export default function FilterSidebar({
  filters,
  amenityOptions,
  verifiedCount,
  instantBookingCount,
  onChange,
  onReset,
}: FilterSidebarProps) {
  const toggleAmenity = (key: string, checked: boolean) => {
    const next = checked
      ? [...filters.amenities, key]
      : filters.amenities.filter((a) => a !== key);
    onChange({ amenities: next });
  };

  return (
    <aside className="sticky top-20 self-start">
      {/* Price */}
      <div className="border-b border-ink/10 py-5 first:pt-0">
        <h3 className="mb-3.5 text-sm font-semibold text-ink">Price per night (KES)</h3>
        <div className="mb-2.5 flex items-center gap-2">
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => onChange({ minPrice: Number(e.target.value) })}
            placeholder="Min"
            className="w-full border border-ink/10 bg-white px-2.5 py-2 text-sm text-ink"
          />
          <span className="text-ink/40">—</span>
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => onChange({ maxPrice: Number(e.target.value) })}
            placeholder="Max"
            className="w-full border border-ink/10 bg-white px-2.5 py-2 text-sm text-ink"
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
        <button
          onClick={onReset}
          className="mt-2 text-sm text-wine underline underline-offset-2"
        >
          Reset filters
        </button>
      </div>
    </aside>
  );
}