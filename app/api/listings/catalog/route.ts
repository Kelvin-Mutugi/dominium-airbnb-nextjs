import { NextRequest, NextResponse } from "next/server";
import { getPublicCatalogPage } from "@/app/lib/public-listings";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const location = searchParams.get("location") ?? "";
  const guests = Number(searchParams.get("guests") ?? 0);
  const from = Number(searchParams.get("from") ?? 0);
  const to = Number(searchParams.get("to") ?? 5);

  if (
    location.length > 160 ||
    !Number.isInteger(guests) || guests < 0 || guests > 50 ||
    !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to - from > 49
  ) {
    return NextResponse.json({ error: "Choose valid listing filters." }, { status: 400 });
  }

  try {
    const listings = await getPublicCatalogPage(location, guests, from, to);
    return NextResponse.json(listings, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Public listing catalog error:", error);
    return NextResponse.json({ error: "Unable to load listings." }, { status: 503 });
  }
}