// ---------------------------------------------------------------------------
// Stored categories: chosen by the host when creating a listing.
// UNCHANGED, so existing rows, forms and links keep working.
// ---------------------------------------------------------------------------
export const LISTING_CATEGORIES = [
  { id: "apartments", label: "Apartments" },
  { id: "beachfront", label: "Beachfront" },
  { id: "villas", label: "Villas" },
  { id: "cabins", label: "Cabins" },
  { id: "farm-stay", label: "Farm stays / ushago" },
  { id: "city", label: "City views" },
  { id: "pet-friendly", label: "Pet-friendly" },
] as const;

// ---------------------------------------------------------------------------
// Derived categories: NOT stored. Worked out from data a listing already has
// (price, guests, location, amenities, and the Kenya-specific fields).
// Hosts never pick these, so there is nothing to maintain on the host side.
// ---------------------------------------------------------------------------
export const DERIVED_CATEGORIES = [
  { id: "budget", label: "Budget" },
  { id: "weekend", label: "Weekend getaways" },
  { id: "family", label: "Family & groups" },
  { id: "pool", label: "With a pool" },
  { id: "work", label: "Work-friendly" },
  { id: "business-travel", label: "Business travel" },
  { id: "secure", label: "Gated & secure" },
  { id: "long-stays", label: "Long stays" },
  { id: "safari", label: "Safari & parks" },
] as const;

// Full list: used for validation and labels, so old links such as
// ?category=city still work even if a tab is no longer shown in the bar.
export const BROWSE_CATEGORIES = [
  { id: "all", label: "All" },
  ...LISTING_CATEGORIES,
  ...DERIVED_CATEGORIES,
  { id: "rare", label: "Dominium picks" },
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number]["id"];
export type DerivedCategory = (typeof DERIVED_CATEGORIES)[number]["id"];
export type BrowseCategory = (typeof BROWSE_CATEGORIES)[number]["id"];

// The row is organized by trip needs, with Dominium picks as the final tab.
// City views and pet-friendly remain valid filters for old links but are not tabs.
export const BAR_CATEGORY_ORDER: readonly BrowseCategory[] = [
  "all",
  "budget",
  "weekend",
  "family",
  "work",
  "business-travel",
  "secure",
  "pool",
  "long-stays",
  "safari",
  "farm-stay",
  "beachfront",
  "apartments",
  "villas",
  "cabins",
  "rare",
];

// A category tab only appears once at least this many published listings match.
export const MIN_LISTINGS_FOR_CATEGORY_TAB = 5;

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

const DERIVED_CATEGORY_IDS: readonly string[] = DERIVED_CATEGORIES.map(
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

export function isDerivedCategory(value: unknown): value is DerivedCategory {
  return typeof value === "string" && DERIVED_CATEGORY_IDS.includes(value);
}

// ---------------------------------------------------------------------------
// Matching rules for derived categories
// ---------------------------------------------------------------------------

// The normalized listing fields used to derive category matches.
export interface CategoryListing {
  pricePerNight?: number;
  maxGuests?: number;
  guests?: number;
  bedrooms?: number;
  beds?: number;
  loc?: string;
  amenities?: readonly string[];
  monthlyRate?: number | null;
  parkDistanceKm?: number | null;
  backupPower?: "none" | "inverter" | "solar" | "generator";
  wifiMbps?: number | null;
  hasWorkspace?: boolean;
  instantBook?: boolean;
  securityFeatures?: readonly string[];
}

export const BUDGET_MAX_KES = 5000;
export const FAMILY_MIN_GUESTS = 6;
export const FAMILY_MIN_BEDS = 3;
export const WORK_MIN_MBPS = 10;
export const SAFARI_MAX_PARK_DISTANCE_KM = 20;

// Places Nairobi residents commonly go for a weekend. Matched against the
// listing's location text ("Town, County"). First draft: edit freely.
export const WEEKEND_PLACE_TERMS = [
  "naivasha",
  "nakuru",
  "nanyuki",
  "laikipia",
  "limuru",
  "kajiado",
  "machakos",
  "narok",
  "diani",
  "kwale",
  "kilifi",
  "watamu",
  "malindi",
  "mombasa",
  "nyali",
  "lamu",
] as const;

export function matchesDerivedCategory(
  listing: CategoryListing,
  category: DerivedCategory,
): boolean {
  switch (category) {
    case "budget":
      return (
        typeof listing.pricePerNight === "number" &&
        listing.pricePerNight > 0 &&
        listing.pricePerNight < BUDGET_MAX_KES
      );

    case "weekend": {
      const loc = (listing.loc ?? "").toLowerCase();
      return WEEKEND_PLACE_TERMS.some((term) => loc.includes(term));
    }

    case "family":
      return (
        (listing.maxGuests ?? listing.guests ?? 0) >= FAMILY_MIN_GUESTS ||
        (listing.bedrooms ?? listing.beds ?? 0) >= FAMILY_MIN_BEDS
      );

    case "pool":
      return (listing.amenities ?? []).some(
        (amenity) => /pool/i.test(amenity) && !/table/i.test(amenity),
      );

    case "work":
      return (
        listing.hasWorkspace === true &&
        (listing.wifiMbps ?? 0) >= WORK_MIN_MBPS &&
        listing.backupPower !== undefined &&
        listing.backupPower !== "none"
      );

    case "business-travel":
      return (
        listing.instantBook === true &&
        listing.hasWorkspace === true &&
        (listing.wifiMbps ?? 0) >= WORK_MIN_MBPS &&
        listing.backupPower !== undefined &&
        listing.backupPower !== "none"
      );

    case "secure": {
      const security = listing.securityFeatures ?? [];
      return (
        security.includes("gated") &&
        (security.includes("guard_24h") || security.includes("cctv_common"))
      );
    }

    case "long-stays":
      return (
        typeof listing.monthlyRate === "number" && listing.monthlyRate > 0
      );

    case "safari":
      return (
        typeof listing.parkDistanceKm === "number" &&
        listing.parkDistanceKm >= 0 &&
        listing.parkDistanceKm <= SAFARI_MAX_PARK_DISTANCE_KM
      );
  }
}

// ---------------------------------------------------------------------------
// Which tabs to show right now
// ---------------------------------------------------------------------------

export type BrowseCategoryCounts = Partial<Record<BrowseCategory, number>>;

// Keep the active tab visible for old or shared URLs, but don't promote empty
// categories into the bar.
export function getVisibleBarCategories(
  counts: BrowseCategoryCounts | undefined,
  activeCategory?: BrowseCategory,
  minCount: number = MIN_LISTINGS_FOR_CATEGORY_TAB,
): BrowseCategory[] {
  return BAR_CATEGORY_ORDER.filter((id) => {
    if (id === "all") return true;
    if (id === "business-travel") return true;
    if (id === activeCategory) return true;
    return (counts?.[id] ?? 0) >= minCount;
  });
}