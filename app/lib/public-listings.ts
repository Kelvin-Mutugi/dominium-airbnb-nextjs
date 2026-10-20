import { unstable_cache } from "next/cache";
import { PLATFORM_CANCELLATION_POLICY } from "@/app/lib/cancellation-policy";
import {
  BAR_CATEGORY_ORDER,
  BUDGET_MAX_KES,
  LISTING_CATEGORY_PROPERTY_TYPE_TERMS,
  SAFARI_MAX_PARK_DISTANCE_KM,
  WEEKEND_PLACE_TERMS,
  type BrowseCategory,
  type BrowseCategoryCounts,
} from "@/app/lib/listing-categories";
import { getPublicSupabaseClient } from "@/app/lib/supabase/public";
import type { Listing } from "@/types/types";

interface ListingRow {
  id: string;
  title: string;
  description: string | null;
  county: string | null;
  town: string | null;
  price_per_night: number | string;
  platform_fee_per_night: number | string | null;
  latitude: number | null;
  longitude: number | null;
  max_guests: number | null;
  bedrooms: number | null;
  amenities: unknown;
  categories: string[] | null;
  average_rating: number | null;
  review_count: number | null;
  listing_images: {
    url: string | null;
    sort_order: number;
    position: number;
    is_cover: boolean;
  }[] | null;
}

export interface PublicListingDetail {
  id: string;
  title: string;
  description: string | null;
  county: string | null;
  town: string | null;
  property_type: string | null;
  categories: string[] | null;
  price_per_night: number | string;
  monthly_rate: number | string | null;
  wifi_mbps: number | null;
  has_workspace: boolean;
  backup_power: string;
  security_features: string[] | null;
  nearest_park_name: string | null;
  park_distance_km: number | string | null;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: unknown;
  features: unknown;
  house_rules: unknown;
  booking_terms: string | null;
  cancellation_policy: string;
  refund_policy: string;
  latitude: number | null;
  longitude: number | null;
  check_in_time: string | null;
  check_out_time: string | null;
  min_nights: number | null;
  service_fee_percent: number | null;
  platform_fee_per_night: number | string | null;
  additional_charges: unknown;
  is_rare_find: boolean | null;
  rare_find_note: string | null;
  average_rating: number | null;
  review_count: number | null;
  listing_images: {
    id: string;
    url: string | null;
    sort_order: number;
    position: number;
    category: string | null;
    room_index: number | null;
    caption: string | null;
    is_cover: boolean;
    width: number | null;
    height: number | null;
  }[] | null;
}

export interface PublicCategoryCountsResult {
  counts: BrowseCategoryCounts;
  unavailableCategories: BrowseCategory[];
}

const CARD_SELECT = `
  id, title, description, county, town, price_per_night, platform_fee_per_night, max_guests,
  bedrooms, amenities, categories, latitude, longitude, average_rating, review_count,
  listing_images ( url, sort_order, position, is_cover )
`;

const DETAIL_SELECT = `
  id, title, description, county, town, property_type, categories,
  price_per_night, monthly_rate, wifi_mbps, has_workspace, backup_power,
  security_features, nearest_park_name, park_distance_km,
  max_guests, bedrooms, bathrooms, amenities, features, house_rules,
  booking_terms, latitude, longitude,
  check_in_time, check_out_time, min_nights, service_fee_percent,
  platform_fee_per_night, additional_charges, is_rare_find, rare_find_note,
  average_rating, review_count,
  listing_images (
    id, url, sort_order, position, category, room_index, caption, is_cover, width, height
  )
`;

const POOL_AMENITY_CLAUSE =
  'amenities.cs.["Pool"],amenities.cs.["pool"],amenities.cs.["Swimming Pool"],amenities.cs.["Swimming pool"]';

function approximateMapCoordinate(value: number | null) {
  return value == null || !Number.isFinite(value)
    ? null
    : Math.round(value * 100) / 100;
}

function toCardListing(row: ListingRow): Listing {
  const images = Array.isArray(row.listing_images)
    ? [...row.listing_images].sort(
        (first, second) =>
          Number(second.is_cover) - Number(first.is_cover) ||
          first.position - second.position ||
          first.sort_order - second.sort_order,
      )
    : [];
  const amenities = Array.isArray(row.amenities)
    ? row.amenities.filter(
        (amenity): amenity is string => typeof amenity === "string",
      )
    : [];

  return {
    id: String(row.id),
    title: row.title ?? "Untitled stay",
    location: [row.town, row.county].filter(Boolean).join(", "),
    latitude: approximateMapCoordinate(
      row.latitude == null ? null : Number(row.latitude),
    ),
    longitude: approximateMapCoordinate(
      row.longitude == null ? null : Number(row.longitude),
    ),
    pricePerNight:
      Number(row.price_per_night) + Number(row.platform_fee_per_night ?? 0),
    bedrooms: row.bedrooms ?? 0,
    guests: row.max_guests ?? 0,
    amenities,
    categories: row.categories ?? [],
    petFriendly:
      row.categories?.includes("pet-friendly") === true ||
      amenities.some((amenity) =>
        /^(pets?|pet[\s-]+friendly)$/i.test(amenity.trim()),
      ),
    description: row.description ?? "",
    rating: Number(row.average_rating ?? 0),
    reviewCount: row.review_count ?? 0,
    verified: true,
    imageUrl: images[0]?.url ?? "",
    imageUrls: images.flatMap((image) => image.url ? [image.url] : []),
  };
}

async function fetchCountyListingPage(
  county: string,
  from: number,
  to: number,
) {
  const { data, error } = await getPublicSupabaseClient()
    .from("listings")
    .select(CARD_SELECT)
    .eq("county", county)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("position", { foreignTable: "listing_images", ascending: true })
    .range(from, to);

  if (error) throw new Error("Unable to load published listings.");
  return ((data ?? []) as unknown as ListingRow[]).map(toCardListing);
}

export const getCachedCountyListingPage = unstable_cache(
  fetchCountyListingPage,
  ["public-county-listings-v1"],
  { revalidate: 120, tags: ["public-listings"] },
);

async function fetchCatalogPage(
  location: string,
  guests: number,
  from: number,
  to: number,
  category: BrowseCategory,
) {
  let query = getPublicSupabaseClient()
    .from("listings")
    .select(CARD_SELECT)
    .eq("status", "published")
    .gte("max_guests", guests);

  if (category === "rare") {
    query = query.eq("is_rare_find", true);
  } else if (category === "budget") {
    query = query.lt("price_per_night", BUDGET_MAX_KES);
  } else if (category === "weekend") {
    query = query.or(
      weekendPlaceClauses().join(","),
    );
  } else if (category === "family") {
    query = query.or("max_guests.gte.6,bedrooms.gte.3");
  } else if (category === "pool") {
    query = query.or(POOL_AMENITY_CLAUSE);
  } else if (category === "work") {
    query = query
      .eq("has_workspace", true)
      .gte("wifi_mbps", 10)
      .neq("backup_power", "none");
  } else if (category === "business-travel") {
    query = query
      .eq("instant_book", true)
      .eq("has_workspace", true)
      .gte("wifi_mbps", 10)
      .neq("backup_power", "none");
  } else if (category === "secure") {
    query = query
      .contains("security_features", ["gated"])
      .or(
        "security_features.cs.{guard_24h},security_features.cs.{cctv_common}",
      );
  } else if (category === "long-stays") {
    query = query.not("monthly_rate", "is", null).gt("monthly_rate", 0);
  } else if (category === "safari") {
    query = query
      .not("park_distance_km", "is", null)
      .lte("park_distance_km", SAFARI_MAX_PARK_DISTANCE_KM);
  } else if (category !== "all") {
    const propertyTypeTerms = LISTING_CATEGORY_PROPERTY_TYPE_TERMS[category];
    if (propertyTypeTerms) {
      const categoryMatch = `categories.cs.{${category}}`;
      const propertyTypeMatches = propertyTypeTerms.map(
        (term) => `property_type.ilike.%${term}%`,
      );
      query = query.or([categoryMatch, ...propertyTypeMatches].join(","));
    } else {
      query = query.contains("categories", [category]);
    }
  }

  const terms = location
    .replace(/[%,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+[—-]\s+|\s*,\s*/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length) {
    const clauses = terms.flatMap((term) => [
      `county.ilike.%${term}%`,
      `town.ilike.%${term}%`,
      `title.ilike.%${term}%`,
    ]);
    query = query.or(clauses.join(","));
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("position", { foreignTable: "listing_images", ascending: true })
    .range(from, to);

  if (error) throw new Error("Unable to load published listings.");
  return ((data ?? []) as unknown as ListingRow[]).map(toCardListing);
}

const getCachedCatalogPage = unstable_cache(
  fetchCatalogPage,
  ["public-listing-catalog-v4"],
  { revalidate: 60, tags: ["public-listings"] },
);

export function getPublicCatalogPage(
  location: string,
  guests: number,
  from: number,
  to: number,
  category: BrowseCategory,
) {
  const normalizedLocation = location
    .replace(/[%,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return getCachedCatalogPage(
    normalizedLocation,
    Math.max(0, guests),
    from,
    to,
    category,
  );
}

function weekendPlaceClauses() {
  return WEEKEND_PLACE_TERMS.flatMap((term) => [
    `county.ilike.%${term}%`,
    `town.ilike.%${term}%`,
  ]);
}

async function countCatalogCategory(
  category: BrowseCategory,
  location: string,
  guests: number,
) {
  const supabase = getPublicSupabaseClient();
  let query = supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");
  if (guests > 0) query = query.gte("max_guests", guests);

  if (location) {
    const terms = location
      .replace(/[%,]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(/\s+[—-]\s+|\s*,\s*/)
      .map((term) => term.trim())
      .filter(Boolean);
    if (terms.length) {
      const clauses = terms.flatMap((term) => [
        `county.ilike.%${term}%`,
        `town.ilike.%${term}%`,
        `title.ilike.%${term}%`,
      ]);
      query = query.or(clauses.join(","));
    }
  }

  if (category === "all") return 0;
  if (category === "rare") {
    query = query.eq("is_rare_find", true);
  } else if (category === "budget") {
    query = query.lt("price_per_night", BUDGET_MAX_KES);
  } else if (category === "weekend") {
    query = query.or(weekendPlaceClauses().join(","));
  } else if (category === "family") {
    query = query.or("max_guests.gte.6,bedrooms.gte.3");
  } else if (category === "pool") {
    query = query.or(POOL_AMENITY_CLAUSE);
  } else if (category === "work") {
    query = query
      .eq("has_workspace", true)
      .gte("wifi_mbps", 10)
      .neq("backup_power", "none");
  } else if (category === "business-travel") {
    query = query
      .eq("instant_book", true)
      .eq("has_workspace", true)
      .gte("wifi_mbps", 10)
      .neq("backup_power", "none");
  } else if (category === "secure") {
    query = query
      .contains("security_features", ["gated"])
      .or(
        "security_features.cs.{guard_24h},security_features.cs.{cctv_common}",
      );
  } else if (category === "long-stays") {
    query = query.not("monthly_rate", "is", null).gt("monthly_rate", 0);
  } else if (category === "safari") {
    query = query
      .not("park_distance_km", "is", null)
      .lte("park_distance_km", SAFARI_MAX_PARK_DISTANCE_KM);
  } else {
    const propertyTypeTerms = LISTING_CATEGORY_PROPERTY_TYPE_TERMS[category];
    if (propertyTypeTerms) {
      const propertyTypeMatches = propertyTypeTerms.map(
        (term) => `property_type.ilike.%${term}%`,
      );
      query = query.or(
        [`categories.cs.{${category}}`, ...propertyTypeMatches].join(","),
      );
    } else {
      query = query.contains("categories", [category]);
    }
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

function isDiscoveryCategory(
  category: BrowseCategory,
): category is
  | "work"
  | "business-travel"
  | "secure"
  | "long-stays"
  | "safari" {
  return [
    "work",
    "business-travel",
    "secure",
    "long-stays",
    "safari",
  ].includes(category);
}

function isMissingDiscoveryColumnError(error: unknown): boolean {
  if (
    !error ||
    typeof error !== "object" ||
    !("code" in error) ||
    !("message" in error)
  ) {
    return false;
  }
  if (
    error.code !== "42703" &&
    error.code !== "PGRST204"
  ) {
    return false;
  }

  return /monthly_rate|wifi_mbps|has_workspace|backup_power|security_features|park_distance_km/i.test(
    String(error.message ?? ""),
  );
}

async function fetchPublicCategoryCounts(
  location: string,
  guests: number,
): Promise<PublicCategoryCountsResult> {
  const categories = BAR_CATEGORY_ORDER.filter((category) => category !== "all");
  const results = await Promise.all(
    categories.map(async (category) => {
      try {
        return {
          category,
          count: await countCatalogCategory(category, location, guests),
          unavailable: false,
        };
      } catch (error) {
        if (!isDiscoveryCategory(category) || !isMissingDiscoveryColumnError(error)) {
          throw error;
        }
        return { category, count: 0, unavailable: true };
      }
    }),
  );
  return {
    counts: Object.fromEntries(
      results.map(({ category, count }) => [category, count]),
    ) as BrowseCategoryCounts,
    unavailableCategories: results
      .filter((result) => result.unavailable)
      .map((result) => result.category),
  };
}

const getCachedPublicCategoryCounts = unstable_cache(
  fetchPublicCategoryCounts,
  ["public-listing-category-counts-v3"],
  { revalidate: 60, tags: ["public-listings"] },
);

export function getPublicCategoryCounts(location: string, guests: number) {
  const normalizedLocation = location
    .replace(/[%,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return getCachedPublicCategoryCounts(
    normalizedLocation,
    Math.max(0, guests),
  );
}

async function fetchPublicListingDetail(
  id: string,
): Promise<PublicListingDetail | null> {
  const { data, error } = await getPublicSupabaseClient()
    .from("listings")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .eq("status", "published")
    .order("position", { foreignTable: "listing_images", ascending: true })
    .maybeSingle();

  if (error) throw new Error("Unable to load published listing details.");
  if (!data) return null;

  return {
    ...(data as unknown as PublicListingDetail),
    cancellation_policy: PLATFORM_CANCELLATION_POLICY,
    refund_policy: PLATFORM_CANCELLATION_POLICY,
  };
}

export const getCachedPublicListingDetail = unstable_cache(
  fetchPublicListingDetail,
  ["public-listing-detail-v1"],
  { revalidate: 300, tags: ["public-listings"] },
);
