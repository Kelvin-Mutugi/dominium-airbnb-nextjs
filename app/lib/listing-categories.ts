export const LISTING_CATEGORIES = [
  { id: "apartments", label: "Apartments" },
  { id: "beachfront", label: "Beachfront" },
  { id: "villas", label: "Villas" },
  { id: "cabins", label: "Cabins" },
  { id: "city", label: "City views" },
  { id: "pet-friendly", label: "Pet-friendly" },
] as const;

export const BROWSE_CATEGORIES = [
  { id: "all", label: "All" },
  ...LISTING_CATEGORIES,
  { id: "rare", label: "Rare finds" },
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number]["id"];
export type BrowseCategory = (typeof BROWSE_CATEGORIES)[number]["id"];

export const LISTING_CATEGORY_PROPERTY_TYPE_TERMS: Partial<
  Record<ListingCategory, readonly string[]>
> = {
  apartments: ["apartment", "flat"],
  villas: ["villa"],
  cabins: ["cabin"],
};

export const BROWSE_CATEGORY_LABELS = Object.fromEntries(
  BROWSE_CATEGORIES.map(({ id, label }) => [id, label]),
) as Record<BrowseCategory, string>;

const BROWSE_CATEGORY_IDS: readonly string[] = BROWSE_CATEGORIES.map(
  ({ id }) => id,
);

export function isListingCategory(value: unknown): value is ListingCategory {
  return (
    typeof value === "string" &&
    LISTING_CATEGORIES.some((category) => category.id === value)
  );
}

export function isBrowseCategory(
  value: string | null,
): value is BrowseCategory {
  return value !== null && BROWSE_CATEGORY_IDS.includes(value);
}