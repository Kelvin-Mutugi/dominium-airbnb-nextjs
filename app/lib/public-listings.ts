import { unstable_cache } from "next/cache";
import { getPublicSupabaseClient } from "@/app/lib/supabase/public";
import type { Listing } from "@/types/types";

interface ListingRow {
  id: string;
  title: string;
  description: string | null;
  county: string | null;
  town: string | null;
  price_per_night: number | string;
  max_guests: number | null;
  bedrooms: number | null;
  amenities: unknown;
  average_rating: number | null;
  review_count: number | null;
  listing_images: { url: string | null; sort_order: number }[] | null;
}

export interface PublicListingDetail {
  id: string;
  title: string;
  description: string | null;
  county: string | null;
  town: string | null;
  property_type: string | null;
  price_per_night: number | string;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: unknown;
  features: unknown;
  house_rules: unknown;
  booking_terms: string | null;
  cancellation_policy: string | null;
  refund_policy: string | null;
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
  listing_images: { url: string | null; sort_order: number }[] | null;
}

const CARD_SELECT = `
  id, title, description, county, town, price_per_night, max_guests,
  bedrooms, amenities, average_rating, review_count,
  listing_images ( url, sort_order )
`;

const DETAIL_SELECT = `
  id, title, description, county, town, property_type, price_per_night,
  max_guests, bedrooms, bathrooms, amenities, features, house_rules,
  booking_terms, cancellation_policy, refund_policy, latitude, longitude,
  check_in_time, check_out_time, min_nights, service_fee_percent,
  platform_fee_per_night, additional_charges, is_rare_find, rare_find_note,
  average_rating, review_count, listing_images ( url, sort_order )
`;

function toCardListing(row: ListingRow): Listing {
  const images = Array.isArray(row.listing_images)
    ? [...row.listing_images].sort((first, second) => first.sort_order - second.sort_order)
    : [];
  const amenities = Array.isArray(row.amenities)
    ? row.amenities.filter((amenity): amenity is string => typeof amenity === "string")
    : [];

  return {
    id: String(row.id),
    title: row.title ?? "Untitled stay",
    location: [row.town, row.county].filter(Boolean).join(", "),
    pricePerNight: Number(row.price_per_night),
    bedrooms: row.bedrooms ?? 0,
    guests: row.max_guests ?? 0,
    amenities,
    description: row.description ?? "",
    rating: Number(row.average_rating ?? 0),
    reviewCount: row.review_count ?? 0,
    verified: true,
    imageUrl: images[0]?.url ?? "",
  };
}

async function fetchCountyListingPage(county: string, from: number, to: number) {
  const { data, error } = await getPublicSupabaseClient()
    .from("listings")
    .select(CARD_SELECT)
    .eq("county", county)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("sort_order", { foreignTable: "listing_images", ascending: true })
    .limit(1, { foreignTable: "listing_images" })
    .range(from, to);

  if (error) throw new Error("Unable to load published listings.");
  return ((data ?? []) as unknown as ListingRow[]).map(toCardListing);
}

export const getCachedCountyListingPage = unstable_cache(
  fetchCountyListingPage,
  ["public-county-listings-v1"],
  { revalidate: 120, tags: ["public-listings"] },
);

async function fetchCatalogPage(location: string, guests: number, from: number, to: number) {
  let query = getPublicSupabaseClient()
    .from("listings")
    .select(CARD_SELECT)
    .eq("status", "published")
    .gte("max_guests", guests);

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
    .order("sort_order", { foreignTable: "listing_images", ascending: true })
    .limit(1, { foreignTable: "listing_images" })
    .range(from, to);

  if (error) throw new Error("Unable to load published listings.");
  return ((data ?? []) as unknown as ListingRow[]).map(toCardListing);
}

const getCachedCatalogPage = unstable_cache(
  fetchCatalogPage,
  ["public-listing-catalog-v1"],
  { revalidate: 60, tags: ["public-listings"] },
);

export function getPublicCatalogPage(location: string, guests: number, from: number, to: number) {
  const normalizedLocation = location.replace(/[%,]/g, " ").replace(/\s+/g, " ").trim();
  return getCachedCatalogPage(normalizedLocation, Math.max(0, guests), from, to);
}

async function fetchPublicListingDetail(id: string): Promise<PublicListingDetail | null> {
  const { data, error } = await getPublicSupabaseClient()
    .from("listings")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .eq("status", "published")
    .order("sort_order", { foreignTable: "listing_images", ascending: true })
    .maybeSingle();

  if (error) throw new Error("Unable to load published listing details.");
  return (data as unknown as PublicListingDetail | null) ?? null;
}

export const getCachedPublicListingDetail = unstable_cache(
  fetchPublicListingDetail,
  ["public-listing-detail-v1"],
  { revalidate: 300, tags: ["public-listings"] },
);