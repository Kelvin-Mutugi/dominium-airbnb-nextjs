import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);

    const county = searchParams.get("county");
    const from = Number(searchParams.get("from") ?? 0);
    const to = Number(searchParams.get("to") ?? 5);

    if (!county) {
      return NextResponse.json(
        { error: "County is required" },
        { status: 400 },
      );
    }

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
      console.error("Supabase listings error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    const listings = (data ?? []).map((listing) => {
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
      };
    });

    return NextResponse.json(listings);
  } catch (error) {
    console.error("Listings API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}