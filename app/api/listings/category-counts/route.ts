import { NextRequest, NextResponse } from "next/server";
import { getPublicCategoryCounts } from "@/app/lib/public-listings";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const location = searchParams.get("location") ?? "";
  const guests = Number(searchParams.get("guests") ?? 0);

  if (
    location.length > 160 ||
    !Number.isInteger(guests) ||
    guests < 0 ||
    guests > 50
  ) {
    return NextResponse.json(
      { error: "Choose valid category filters." },
      { status: 400 },
    );
  }

  try {
    const result = await getPublicCategoryCounts(location, guests);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  } catch (error) {
    console.error("Public listing category count error:", error);
    return NextResponse.json(
      { error: "Unable to load listing categories." },
      { status: 503 },
    );
  }
}
