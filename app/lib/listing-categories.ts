export const LISTING_CATEGORIES = [
  { id: "apartments", label: "Apartments" },
  { id: "beachfront", label: "Beachfront" },
  { id: "villas", label: "Villas" },
  { id: "cabins", label: "Cabins" },
  { id: "city", label: "City views" },
  { id: "pet-friendly", label: "Pet-friendly" },
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number]["id"];
export type BrowseCategory = "all" | ListingCategory | "rare";

export const BROWSE_CATEGORY_LABELS = {
  all: "All",
  apartments: "Apartments",
  beachfront: "Beachfront",
  villas: "Villas",
  cabins: "Cabins",
  city: "City views",
  "pet-friendly": "Pet-friendly",
  rare: "Rare finds",
} satisfies Record<BrowseCategory, string>;

const BROWSE_CATEGORY_IDS: readonly string[] = [
  "all",
  ...LISTING_CATEGORIES.map(({ id }) => id),
  "rare",
];

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