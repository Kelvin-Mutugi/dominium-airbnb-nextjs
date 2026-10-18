import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getHostArrivalGuidesData,
  getHostListingData,
} from "@/app/lib/host/actions";
import type { HostArrivalGuideDetails, Listing } from "@/app/lib/host/types";
import ArrivalGuideQuickEdit from "@/components/host/ArrivalGuideQuickEdit";

function emptyArrivalGuide(
  listing: Listing,
  guide: HostArrivalGuideDetails | null,
): HostArrivalGuideDetails {
  return {
    arrival_address: guide?.arrival_address ?? listing.address ?? "",
    arrival_directions: guide?.arrival_directions ?? "",
    check_in_instructions: guide?.check_in_instructions ?? "",
    wifi_name: guide?.wifi_name ?? "",
    wifi_password: guide?.wifi_password ?? "",
    arrival_contact: guide?.arrival_contact ?? "",
    local_tips: guide?.local_tips ?? "",
  };
}

export default async function HostListingArrivalGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let listing: Listing;

  try {
    listing = (await getHostListingData(id)) as Listing;
  } catch (error) {
    console.error("Failed to load listing for its arrival guide:", error);
    notFound();
  }

  const guides = await getHostArrivalGuidesData([id]);
  const initialGuide = emptyArrivalGuide(listing, guides[id] ?? null);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <Link
          href="/host/listings"
          className="text-sm font-semibold text-[#9C2454] hover:underline"
        >
          ← Back to listings
        </Link>
        <p className="mt-4 text-sm font-medium text-gray-500">
          Guest arrival information
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[#1B1A2E] sm:text-3xl">
          {listing.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          Keep these instructions up to date so confirmed guests know where to
          go and how to check in. Guests can view the private guide from their
          booking.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[#E9E6DD] bg-white">
        <div className="border-b border-[#E9E6DD] px-4 py-4 sm:px-6">
          <h2 className="font-semibold text-[#1B1A2E]">Arrival guide details</h2>
          <p className="mt-1 text-sm text-gray-600">
            Only guests with a confirmed or completed booking can see private
            arrival details such as Wi-Fi information.
          </p>
        </div>
        <ArrivalGuideQuickEdit
          listingId={listing.id}
          initialGuide={initialGuide}
        />
      </section>
    </div>
  );
}
