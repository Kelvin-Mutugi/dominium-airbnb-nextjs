import { createClient } from "@/app/lib/supabase/server";
import CountyBasedListings from "@/components/listings/Countybasedlistings/CountyBasedListings";
import type { Listing } from "@/types/types";

const PAGE_SIZE = 6;

async function fetchListingPage(
  county: string,
  from: number,
  to: number,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(`
      id,
      title,
      description,
      county,
      town,
      price_per_night,
      max_guests,
      bedrooms,
      amenities,
      average_rating,
      review_count,
      listing_images (
        url,
        sort_order
      )
    `)
    .eq("county", county)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("sort_order", {
      foreignTable: "listing_images",
      ascending: true,
    })
    .range(from, to);

  if (error) {
    throw error;
  }

  return (data ?? []).map((listing) => {
    const images = Array.isArray(listing.listing_images)
      ? [...listing.listing_images].sort(
          (first, second) =>
            first.sort_order - second.sort_order,
        )
      : [];

    const amenities = Array.isArray(listing.amenities)
      ? listing.amenities.filter(
          (amenity): amenity is string =>
            typeof amenity === "string",
        )
      : [];

    return {
      id: String(listing.id),
      title: listing.title,
      location: [listing.town, listing.county]
        .filter(Boolean)
        .join(", "),
      pricePerNight: Number(listing.price_per_night),
      bedrooms: listing.bedrooms ?? 0,
      guests: listing.max_guests,
      amenities,
      description: listing.description,
      rating: Number(listing.average_rating ?? 0),
      reviewCount: listing.review_count ?? 0,
      verified: true,
      imageUrl: images[0]?.url ?? "",
    } satisfies Listing;
  });
}

export default async function ListingsPage({
  params,
}: {
  params: Promise<{ county: string }>;
}) {
  const { county } = await params;

  const listings = await fetchListingPage(
    county,
    0,
    PAGE_SIZE - 1,
  );

  return (
    <CountyBasedListings
      county={county}
      initialListings={listings}
      pageSize={PAGE_SIZE}
    />
  );
}