import { getCachedCountyListingPage } from "@/app/lib/public-listings";
import CountyBasedListings from "@/components/listings/Countybasedlistings/CountyBasedListings";

const PAGE_SIZE = 6;

export default async function ListingsPage({
  params,
}: {
  params: Promise<{ county: string }>;
}) {
  const { county } = await params;

  const listings = await getCachedCountyListingPage(
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