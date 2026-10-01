import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import HomePageClient from "@/components/HomePageClient";
import { getHomepageDestinationListings, getHomepageFeaturedListings } from "@/app/lib/homepage-data";
import { HOMEPAGE_DESTINATIONS, type HomepageDestination } from "@/app/homepageSections";
import DestinationListings from "@/components/listings/DestinationListings";
import type { Listing } from "@/components/homeData";

function uniqueListings(listings: Listing[]) {
  return listings.filter(
    (listing, index, allListings) => allListings.findIndex((candidate) => candidate.id === listing.id) === index,
  );
}

function DestinationSkeletons() {
  return (
    <>
      {HOMEPAGE_DESTINATIONS.map((destination) => (
        <DestinationListings key={destination.slug} label={destination.label} slug={destination.slug} listings={[]} isLoading />
      ))}
    </>
  );
}

async function DestinationSection({
  destination,
  featuredIds,
  listingsPromise,
}: {
  destination: HomepageDestination;
  featuredIds: string[];
  listingsPromise: Promise<Listing[]>;
}) {
  const destinationRows = await listingsPromise;
  const featuredIdSet = new Set(featuredIds);
  const listings = uniqueListings(destinationRows)
    .filter((listing) => {
      const location = listing.loc.toLowerCase();
      return !featuredIdSet.has(listing.id) && destination.searchTerms.some((term) => location.includes(term));
    })
    .slice(0, 9);

  if (!listings.length) return null;
  return <DestinationListings label={destination.label} slug={destination.slug} listings={listings} />;
}

async function HomepageContent() {
  await connection();
  const destinationRequests = HOMEPAGE_DESTINATIONS.map((destination) => ({
    destination,
    listingsPromise: getHomepageDestinationListings(destination.searchTerms).catch((error: unknown) => {
      console.error(`Failed to load ${destination.label.toLowerCase()} listings:`, error);
      return [];
    }),
  }));

  let featuredListings: Listing[] = [];
  try {
    featuredListings = await getHomepageFeaturedListings();
  } catch (error) {
    console.error("Failed to load featured homepage listings:", error);
  }

  const featuredIds = featuredListings.map((listing) => listing.id);
  const destinationContent = destinationRequests.map(({ destination, listingsPromise }) => (
    <Suspense
      key={destination.slug}
      fallback={<DestinationListings label={destination.label} slug={destination.slug} listings={[]} isLoading />}
    >
      <DestinationSection destination={destination} featuredIds={featuredIds} listingsPromise={listingsPromise} />
    </Suspense>
  ));

  return <HomePageClient listings={featuredListings}>{destinationContent}</HomePageClient>;
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageClient listings={[]} isLoading><DestinationSkeletons /></HomePageClient>}>
      <HomepageContent />
    </Suspense>
  );
}