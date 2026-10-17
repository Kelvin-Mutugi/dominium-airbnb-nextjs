import { NextRequest, NextResponse } from "next/server";
import { isBrowseCategory } from "@/app/lib/listing-categories";
import { getPublicCatalogPage } from "@/app/lib/public-listings";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const location = searchParams.get("location") ?? "";
  const guests = Number(searchParams.get("guests") ?? 0);
  const categoryParam = searchParams.get("category");
  const category = categoryParam ?? "all";
  const from = Number(searchParams.get("from") ?? 0);
  const to = Number(searchParams.get("to") ?? 5);

  if (
    location.length > 160 ||
    !isBrowseCategory(category) ||
    !Number.isInteger(guests) || guests < 0 || guests > 50 ||
    !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to - from > 49
  ) {
    return NextResponse.json({ error: "Choose valid listing filters." }, { status: 400 });
  }

  try {
    const listings = await getPublicCatalogPage(
      location,
      guests,
      from,
      to,
      category,
    );
    return NextResponse.json(listings, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Public listing catalog error:", error);
    return NextResponse.json({ error: "Unable to load listings." }, { status: 503 });
  }
}