// app/host/listings/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getHostListingData } from "@/app/lib/host/actions";
import type { Listing, ListingImage, ListingFormValues } from "@/app/lib/host/types";

type ListingWithImages = Listing & {
  listing_images?: ListingImage[];
} & Pick<ListingFormValues, "arrival_address" | "arrival_directions" | "check_in_instructions" | "wifi_name" | "wifi_password" | "arrival_contact" | "local_tips">;

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<ListingWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getHostListingData(id as string);
        setListing(data as ListingWithImages);
      } catch (err) {
        console.error("Failed to load listing:", err);
        setError("We couldn't load this listing.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <p className="text-gray-500">Loading listing…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#12231d]">Listing details</h1>
        <p className="mt-1 text-sm text-gray-500">Hosts can review their listing details, but edits and publishing are handled by the admin team.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : listing ? (
        <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E23E85]">Property</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#12231d]">{listing.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{listing.town}, {listing.county}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Price</p>
              <p className="mt-2 text-lg font-semibold text-[#12231d]">KES {Number(listing.price_per_night).toLocaleString()}/night</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Capacity</p>
              <p className="mt-2 text-lg font-semibold text-[#12231d]">{listing.max_guests} guests</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Bedrooms</p>
              <p className="mt-2 text-lg font-semibold text-[#12231d]">{listing.bedrooms}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Bathrooms</p>
              <p className="mt-2 text-lg font-semibold text-[#12231d]">{listing.bathrooms}</p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This listing is currently in admin-managed verification. Any content changes must be submitted through the admin team.
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Description</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700">{listing.description || "No description provided yet."}</p>
          </div>
        </div>
      ) : null}

      <Link href="/host/listings" className="inline-flex items-center text-sm font-semibold text-[#12231d] underline underline-offset-4">
        Back to listings
      </Link>
    </div>
  );
}

