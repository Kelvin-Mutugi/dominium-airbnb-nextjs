import type { Amenity, Listing } from "@/components/homeData";
import { HOMEPAGE_DESTINATIONS } from "@/app/homepageSections";
import { createClient } from "@/app/lib/supabase/server";

const FEATURED_PAGE_SIZE = 8;
const DESTINATION_PAGE_SIZE = 10;

interface DatabaseListing {
  id: string;
  title: string;
  description: string;
  county: string;
  town: string;
  price_per_night: number | string;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: unknown;
  listing_images?: { url?: string | null; sort_order: number }[] | null;
}

function normalizeAmenities(value: unknown): Amenity[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<Amenity>(["wifi", "ac", "pool", "parking"]);
  return value.filter((item): item is Amenity => typeof item === "string" && allowed.has(item as Amenity));
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
  const formattedPrice = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(price);
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
    minNights: 1,
    pricePerNight: price,
    serviceFeePercent: 0.1,
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

function uniqueListings(listings: Listing[]) {
  return listings.filter(
    (listing, index, allListings) => allListings.findIndex((candidate) => candidate.id === listing.id) === index,
  );
}

const LISTING_SELECT = `
  id, title, description, county, town, price_per_night,
  max_guests, bedrooms, bathrooms, amenities,
  listing_images ( url, sort_order )
`;

export async function getHomepageListings(): Promise<Listing[]> {
  const supabase = await createClient();

  async function fetchListings({ searchTerms, limit }: { searchTerms?: string[]; limit: number }) {
    let query = supabase.from("listings").select(LISTING_SELECT).eq("status", "published");

    if (searchTerms?.length) {
      const clauses = searchTerms.flatMap((term) => [
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
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as DatabaseListing[]).map(normalizeListing);
  }

  const [featuredListings, ...destinationResults] = await Promise.all([
    fetchListings({ limit: FEATURED_PAGE_SIZE }),
    ...HOMEPAGE_DESTINATIONS.map((destination) =>
      fetchListings({ searchTerms: destination.searchTerms, limit: DESTINATION_PAGE_SIZE }),
    ),
  ]);

  const featured = uniqueListings(featuredListings);
  const featuredIds = new Set(featured.map((listing) => listing.id));
  const destinations = uniqueListings(destinationResults.flat()).filter((listing) => !featuredIds.has(listing.id));
  return [...featured, ...destinations];
}