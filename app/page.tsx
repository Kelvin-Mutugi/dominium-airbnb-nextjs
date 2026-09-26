import { Suspense } from "react";
import { connection } from "next/server";
import HomePageClient from "@/components/HomePageClient";
import { getHomepageListings } from "@/app/lib/homepage-data";
import type { Listing } from "@/components/homeData";

async function HomepageContent() {
  await connection();
  let listings: Listing[] = [];
  try {
    listings = await getHomepageListings();
  } catch (error) {
    console.error("Failed to load homepage listings:", error);
  }

  return <HomePageClient listings={listings} />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageClient listings={[]} isLoading />}>
      <HomepageContent />
    </Suspense>
  );
}