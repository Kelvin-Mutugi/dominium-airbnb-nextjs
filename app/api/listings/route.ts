import { NextRequest, NextResponse } from "next/server";
import { getCachedCountyListingPage } from "@/app/lib/public-listings";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const county = searchParams.get("county");
    const from = Number(searchParams.get("from") ?? 0);
    const to = Number(searchParams.get("to") ?? 5);

    if (!county || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to - from > 49) {
      return NextResponse.json(
        { error: "Choose a county and valid page range." },
        { status: 400 },
      );
    }

    const listings = await getCachedCountyListingPage(county, from, to);
    return NextResponse.json(listings, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Listings API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}