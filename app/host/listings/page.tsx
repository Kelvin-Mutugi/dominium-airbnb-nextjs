// app/host/listings/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getHostListingsData } from "@/app/lib/host/actions";
import type { Listing } from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";

const FILTERS = [
  "all",
  "published",
  "draft",
  "suspended",
] as const;

type Filter = (typeof FILTERS)[number];

export default function HostListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const [error, setError] = useState<string | null>(null);

  async function load(showLoader = false) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError(null);

      const data = await getHostListingsData();
      setListings(data);
    } catch (err) {
      console.error("Failed to load listings:", err);
      setError(
        "We couldn't load your listings. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(true);
  }, []);

  const visible = listings.filter(
    (l) => filter === "all" || l.status === filter,
  );

  /*
   * Initial loading state
   */
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
        </div>

        {/* Filter skeletons */}
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <div
              key={f}
              className="h-8 w-20 animate-pulse rounded-full bg-gray-200"
            />
          ))}
        </div>

        {/* Listing skeletons */}
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="h-24 w-full shrink-0 rounded-xl bg-gray-200 sm:w-36" />

                <div className="flex-1 space-y-3">
                  <div className="h-5 w-56 rounded bg-gray-200" />
                  <div className="h-4 w-72 rounded bg-gray-200" />
                  <div className="h-3 w-40 rounded bg-gray-200" />
                </div>

                <div className="flex gap-2">
                  <div className="h-8 w-14 rounded-lg bg-gray-200" />
                  <div className="h-8 w-20 rounded-lg bg-gray-200" />
                  <div className="h-8 w-16 rounded-lg bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#12231d]">
          Your listings
        </h1>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Listings are currently reviewed and managed by the admin team. Hosts can view their property details, but cannot add, edit, publish, or delete listings during this verification phase.
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            onClick={() => load(true)}
            className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f;

          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ec1561]/30 ${
                active
                  ? "bg-[#12231d] text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 hover:text-[#12231d]"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {visible.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No listings here yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((listing) => {
            const images = (
              listing as Listing & {
                listing_images?: {
                  url: string;
                  sort_order: number;
                }[];
              }
            ).listing_images;

            const cover = images
              ?.sort(
                (a, b) => a.sort_order - b.sort_order,
              )?.[0]?.url;

            return (
              <div
                key={listing.id}
                className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center"
              >
                {/* Cover image */}
                <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:w-36">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={listing.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      No photo
                    </div>
                  )}
                </div>

                {/* Listing information */}
                <Link href={`/host/listings/${listing.id}`} className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#12231d]">
                      {listing.title}
                    </h3>

                    <StatusBadge status={listing.status} />

                    {!listing.is_publish_ready &&
                      listing.status !== "published" && (
                        <span className="text-xs text-gray-400">
                          · incomplete
                        </span>
                      )}
                  </div>

                  <p className="text-sm text-gray-500">
                    {listing.town}, {listing.county} · KES{" "}
                    {listing.price_per_night.toLocaleString()}
                    /night · {listing.bedrooms} bd ·{" "}
                    {listing.bathrooms} ba
                  </p>

                  <p className="text-xs text-gray-400">
                    ★ {listing.average_rating.toFixed(1)} (
                    {listing.review_count} reviews)
                  </p>
                </Link>

                <div className="flex shrink-0 items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                  View details
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
