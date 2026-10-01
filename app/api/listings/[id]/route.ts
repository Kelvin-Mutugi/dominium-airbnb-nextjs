import { NextResponse } from "next/server";
import { getCachedPublicListingDetail } from "@/app/lib/public-listings";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  try {
    const listing = await getCachedPublicListingDetail(id);
    if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    return NextResponse.json(listing, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Public listing detail error:", error);
    return NextResponse.json({ error: "Unable to load listing details." }, { status: 503 });
  }
}