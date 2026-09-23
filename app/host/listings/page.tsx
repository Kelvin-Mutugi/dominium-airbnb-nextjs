// app/host/listings/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Check,
  Edit3,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  getHostListingsData,
  setHostListingStatus,
  deleteHostListing,
} from "@/app/lib/host/actions";
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

  // ID of the listing currently being updated/deleted
  const [actionId, setActionId] = useState<string | null>(null);

  // Which action is currently happening
  const [actionType, setActionType] = useState<
    "publish" | "delete" | null
  >(null);

  // Listing waiting for delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  async function toggleStatus(listing: Listing) {
    // Prevent duplicate actions
    if (actionId) return;

    const next =
      listing.status === "published" ? "draft" : "published";

    if (next === "published" && !listing.is_publish_ready) {
      setError(
        "Add a description (40+ characters) and a price before publishing.",
      );
      return;
    }

    setActionId(listing.id);
    setActionType("publish");
    setError(null);
    setSuccess(null);

    try {
      await setHostListingStatus(listing.id, next);

      await load();

      setSuccess(
        next === "published"
          ? "Listing published successfully."
          : "Listing unpublished successfully.",
      );

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error("Failed to update listing status:", err);
      setError(
        "We couldn't update this listing. Please try again.",
      );
    } finally {
      setActionId(null);
      setActionType(null);
    }
  }

  async function handleDelete(id: string) {
    // Prevent duplicate actions
    if (actionId) return;

    setActionId(id);
    setActionType("delete");
    setError(null);
    setSuccess(null);

    try {
      await deleteHostListing(id);

      setConfirmDelete(null);

      await load();

      setSuccess("Listing deleted successfully.");

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error("Failed to delete listing:", err);
      setError(
        "We couldn't delete this listing. Please try again.",
      );
    } finally {
      setActionId(null);
      setActionType(null);
    }
  }

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

        <Link
          href="/host/listings/new"
          className="flex items-center gap-1.5 rounded-lg bg-[#ec1561] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d91459] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/30"
        >
          <Plus className="h-4 w-4" />
          New listing
        </Link>
      </div>

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <Check className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

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

            const isUpdating =
              actionId === listing.id && actionType === "publish";

            const isDeleting =
              actionId === listing.id && actionType === "delete";

            const isBusy = actionId === listing.id;

            return (
              <div
                key={listing.id}
                className={`flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm transition-opacity sm:flex-row sm:items-center ${
                  isBusy ? "opacity-70" : ""
                }`}
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
                <div className="flex-1">
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
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-wrap gap-2">
                  {/* Edit */}
                  <Link
                    href={`/host/listings/${listing.id}/edit`}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#12231d] transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#12231d]/20"
                    aria-disabled={isBusy}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </Link>

                  {/* Publish / Unpublish */}
                  {listing.status !== "suspended" && (
                    <button
                      disabled={isBusy}
                      onClick={() => toggleStatus(listing)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-[#f2a71b]/20 px-3 py-1.5 text-sm font-medium text-[#b9770e] transition hover:bg-[#f2a71b]/30 focus:outline-none focus:ring-2 focus:ring-[#f2a71b]/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />

                          {listing.status === "published"
                            ? "Unpublishing..."
                            : "Publishing..."}
                        </>
                      ) : listing.status === "published" ? (
                        "Unpublish"
                      ) : (
                        "Publish"
                      )}
                    </button>
                  )}

                  {/* Delete */}
                  {confirmDelete === listing.id ? (
                    <div className="flex gap-1">
                      <button
                        disabled={isDeleting}
                        onClick={() =>
                          handleDelete(listing.id)
                        }
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Confirm
                          </>
                        )}
                      </button>

                      <button
                        disabled={isDeleting}
                        onClick={() => setConfirmDelete(null)}
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={isBusy}
                      onClick={() =>
                        setConfirmDelete(listing.id)
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
