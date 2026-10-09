import type { Amenity, Listing } from "@/components/homeData";
import { HOMEPAGE_DESTINATIONS } from "@/app/homepageSections";
import { normalizeListingAdditionalCharges } from "@/app/lib/listing-charges";
import { getPublicSupabaseClient } from "@/app/lib/supabase/public";
import { unstable_cache } from "next/cache";

const FEATURED_PAGE_SIZE = 8;
const DESTINATION_PAGE_SIZE = 9;
const DESTINATION_FETCH_SIZE = DESTINATION_PAGE_SIZE + FEATURED_PAGE_SIZE;

interface DatabaseListing {
  id: string;
  title: string;
  description: string;
  county: string;
  town: string;
  price_per_night: number | string;
  platform_fee_per_night: number | string | null;
  additional_charges: unknown;
  min_nights: number | null;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: unknown;
  listing_images?: { url?: string | null; sort_order: number }[] | null;
}

function normalizeAmenities(value: unknown): Amenity[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<Amenity>(["wifi", "ac", "pool", "parking"]);
  return value.filter(
    (item): item is Amenity =>
      typeof item === "string" && allowed.has(item as Amenity),
  );
}

function normalizeListing(listing: DatabaseListing): Listing {
  const gallery = Array.isArray(listing.listing_images)
    ? [...listing.listing_images]
        .sort((first, second) => first.sort_order - second.sort_order)
        .map((imageRow) => imageRow.url)
        .filter((url): url is string => Boolean(url))
    : [];
  const amenities = normalizeAmenities(listing.amenities);
  const price = Number(listing.price_per_night ?? 0);
  const guestNightlyPrice = price + Number(listing.platform_fee_per_night ?? 0);
  const formattedPrice = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(guestNightlyPrice);
  const loc = [listing.town, listing.county].filter(Boolean).join(", ");

  return {
    id: String(listing.id),
    name: listing.title ?? "Untitled listing",
    loc: loc || "Location unavailable",
    price: formattedPrice || "Price on request",
    detail: `Max guests: ${listing.max_guests ?? 0}${amenities.length ? ` · ${amenities.slice(0, 2).join(" · ")}` : ""}`,
    img: gallery[0] ?? "",
    gallery,
    description: listing.description ?? "",
    maxGuests: listing.max_guests ?? 0,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    minNights: listing.min_nights ?? 1,
    pricePerNight: price,
    serviceFeePercent: 0,
    serviceFeePerNight: Number(listing.platform_fee_per_night ?? 0),
    additionalCharges: normalizeListingAdditionalCharges(
      listing.additional_charges,
    ),
    features: [
      ...(listing.bedrooms ? [`${listing.bedrooms} bedrooms`] : []),
      ...(listing.bathrooms ? [`${listing.bathrooms} bathrooms`] : []),
      ...amenities,
    ],
    host: "Host",
    rating: undefined,
    reviewCount: undefined,
    verified: true,
    rareFind: false,
    guests: listing.max_guests,
    beds: listing.bedrooms,
    baths: listing.bathrooms,
    amenities,
  };
}

const LISTING_SELECT = `
  id, title, description, county, town, price_per_night,
  platform_fee_per_night, additional_charges, min_nights,
  max_guests, bedrooms, bathrooms, amenities,
  listing_images ( url, sort_order )
`;

async function fetchHomepageListings(
  searchTerms: string[] | null,
  limit: number,
): Promise<Listing[]> {
  const supabase = getPublicSupabaseClient();

  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "published");

  if (searchTerms?.length) {
    const clauses = searchTerms.flatMap((term) => [
      `county.ilike.%${term}%`,
      `town.ilike.%${term}%`,
    ]);
    query = query.or(clauses.join(","));
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("sort_order", { foreignTable: "listing_images", ascending: true })
    .limit(1, { foreignTable: "listing_images" })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as DatabaseListing[]).map(normalizeListing);
}

const getCachedHomepageFeatured = unstable_cache(
  () => fetchHomepageListings(null, FEATURED_PAGE_SIZE),
  ["homepage-featured-v1", String(FEATURED_PAGE_SIZE)],
  {
    revalidate: 300,
    tags: ["public-listings", "homepage-featured"],
  },
);

const getCachedHomepageDestination = unstable_cache(
  (searchTerms: string[]) =>
    fetchHomepageListings(searchTerms, DESTINATION_FETCH_SIZE),
  [
    "homepage-destination-v1",
    String(DESTINATION_PAGE_SIZE),
    String(DESTINATION_FETCH_SIZE),
  ],
  {
    revalidate: 300,
    tags: ["public-listings", "homepage-destinations"],
  },
);

export function getHomepageFeaturedListings(): Promise<Listing[]> {
  return getCachedHomepageFeatured();
}

export function getHomepageDestinationListings(
  searchTerms: string[],
): Promise<Listing[]> {
  return getCachedHomepageDestination(searchTerms);
}
