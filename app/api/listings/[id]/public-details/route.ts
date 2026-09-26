import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function publicHostName(fullName: string | null, businessName: string | null) {
  const business = businessName?.trim();
  if (business) return business;

  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "Host";
  return `${parts[0]} ${parts.at(-1)?.charAt(0)}.`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  const admin = getSupabaseAdmin();
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id, host_id, county, town")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (listingError) return NextResponse.json({ error: "Unable to load listing details." }, { status: 503 });
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  const [{ data: profile }, { data: relatedListings, error: relatedError }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, business_name, avatar_url, host_verified_at, host_bio")
      .eq("id", listing.host_id)
      .maybeSingle(),
    admin
      .from("listings")
      .select("id, title, town, county, price_per_night, listing_images(url, sort_order)")
      .eq("status", "published")
      .eq("county", listing.county)
      .neq("id", listing.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (relatedError) return NextResponse.json({ error: "Unable to load nearby listings." }, { status: 503 });

  const related = relatedListings ?? [];
  const nearest = related.length > 0 || !listing.town
    ? related
    : (await admin
        .from("listings")
        .select("id, title, town, county, price_per_night, listing_images(url, sort_order)")
        .eq("status", "published")
        .eq("town", listing.town)
        .neq("id", listing.id)
        .order("created_at", { ascending: false })
        .limit(6)).data ?? [];

  const displayName = publicHostName(profile?.full_name ?? null, profile?.business_name ?? null);
  return NextResponse.json(
    {
      host: {
        displayName,
        avatarUrl: profile?.avatar_url ?? null,
        verified: Boolean(profile?.host_verified_at),
        bio: profile?.host_bio?.trim() || null,
      },
      relatedListings: nearest.map((item) => {
        const images = Array.isArray(item.listing_images)
          ? [...item.listing_images].sort((first, second) => first.sort_order - second.sort_order)
          : [];
        return {
          id: item.id,
          name: item.title,
          location: [item.town, item.county].filter(Boolean).join(", "),
          pricePerNight: Number(item.price_per_night),
          imageUrl: images[0]?.url ?? "",
        };
      }),
    },
    { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}