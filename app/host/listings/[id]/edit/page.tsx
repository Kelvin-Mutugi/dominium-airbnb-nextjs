// app/host/listings/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  getHostListingData,
  getHostAvailabilityData,
  updateHostListing,
  setHostListingStatus,
  addHostAvailabilityBlock,
  removeHostAvailabilityBlock,
} from "@/app/lib/host/actions";
import ListingForm from "@/components/host/ListingForm";
import ImageManager from "@/components/host/ImageManager";
import StatusBadge from "@/components/host/StatusBadge";
import type {
  Listing,
  ListingImage,
  ListingFormValues,
  AvailabilityBlock,
} from "@/app/lib/host/types";

type ListingWithImages = Listing & {
  listing_images?: ListingImage[];
};

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();

  const [listing, setListing] = useState<Listing | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);

  const [loading, setLoading] = useState(true);

  const [blockForm, setBlockForm] = useState({
    start_date: "",
    end_date: "",
    reason: "",
  });

  const [publishing, setPublishing] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [removingBlockId, setRemovingBlockId] = useState<string | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getHostListingData(id as string);
        const listingWithImages = data as ListingWithImages;

        setListing(listingWithImages);
        setImages(listingWithImages.listing_images ?? []);
        setBlocks(await getHostAvailabilityData(id as string));
      } catch (err) {
        console.error("Failed to load listing:", err);
        setError("We couldn't load this listing.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleSubmit(values: ListingFormValues) {
    try {
      setError(null);
      setSuccess(null);

      const updated = await updateHostListing(
        id as string,
        values,
      );

      setListing((prev) =>
        prev ? { ...prev, ...updated } : updated,
      );

      setSuccess("Listing changes saved successfully.");

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error("Failed to update listing:", err);
      setError(
        "We couldn't save your changes. Please try again.",
      );
    }
  }

  async function handlePublishToggle() {
    if (!listing || publishing) return;

    const next =
      listing.status === "published"
        ? "draft"
        : "published";

    if (
      next === "published" &&
      !listing.is_publish_ready
    ) {
      setError(
        "Add a description (40+ characters) and a price before publishing.",
      );
      return;
    }

    setPublishing(true);
    setError(null);
    setSuccess(null);

    try {
      await setHostListingStatus(listing.id, next);

      setListing({
        ...listing,
        status: next,
      });

      setSuccess(
        next === "published"
          ? "Listing published successfully."
          : "Listing unpublished successfully.",
      );

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(
        "Failed to update listing status:",
        err,
      );

      setError(
        "We couldn't update the listing status. Please try again.",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function handleAddBlock(e: React.FormEvent) {
    e.preventDefault();

    if (
      !blockForm.start_date ||
      !blockForm.end_date ||
      addingBlock
    ) {
      return;
    }

    setAddingBlock(true);
    setError(null);
    setSuccess(null);

    try {
      await addHostAvailabilityBlock(
        id as string,
        blockForm.start_date,
        blockForm.end_date,
        blockForm.reason,
      );

      setBlocks(
        await getHostAvailabilityData(id as string),
      );

      setBlockForm({
        start_date: "",
        end_date: "",
        reason: "",
      });

      setSuccess("Dates blocked successfully.");

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(
        "Failed to block dates:",
        err,
      );

      setError(
        "We couldn't block these dates. Please try again.",
      );
    } finally {
      setAddingBlock(false);
    }
  }

  async function handleRemoveBlock(blockId: string) {
    if (removingBlockId) return;

    setRemovingBlockId(blockId);
    setError(null);
    setSuccess(null);

    try {
      await removeHostAvailabilityBlock(blockId);

      setBlocks((current) =>
        current.filter((block) => block.id !== blockId),
      );

      setSuccess("Blocked dates removed.");

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(
        "Failed to remove blocked dates:",
        err,
      );

      setError(
        "We couldn't remove these blocked dates. Please try again.",
      );
    } finally {
      setRemovingBlockId(null);
    }
  }

  if (loading || !listing) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200" />

        <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />

        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>
    );
  }

  const initialValues: Partial<ListingFormValues> = {
    title: listing.title,
    description: listing.description,
    county: listing.county,
    town: listing.town,
    address: listing.address ?? "",
    price_per_night: listing.price_per_night,
    max_guests: listing.max_guests,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    amenities: listing.amenities ?? [],
    features: listing.features ?? [],
    house_rules: listing.house_rules ?? [],
    check_in_time: listing.check_in_time,
    check_out_time: listing.check_out_time,
    min_nights: listing.min_nights,
    instant_book: listing.instant_book,
    cancellation_policy:
      listing.cancellation_policy ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#12231d]">
            {listing.title}
          </h1>

          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={listing.status} />

            <span className="text-xs text-gray-400">
              /{listing.slug}
            </span>
          </div>
        </div>

        {listing.status !== "suspended" && (
          <button
            disabled={publishing}
            onClick={handlePublishToggle}
            className="flex items-center gap-2 rounded-lg bg-[#f2a71b] px-4 py-2 text-sm font-semibold text-[#12231d] transition hover:bg-[#e59d17] focus:outline-none focus:ring-2 focus:ring-[#f2a71b]/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />

                {listing.status === "published"
                  ? "Unpublishing..."
                  : "Publishing..."}
              </>
            ) : listing.status === "published" ? (
              "Unpublish"
            ) : (
              "Publish listing"
            )}
          </button>
        )}
      </div>

      {/* Success */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Images */}
      <ImageManager
        listingId={listing.id}
        images={images}
        onChange={setImages}
      />

      {/* Listing Form */}
      <ListingForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
      />

      {/* Availability */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#12231d]/10">
            <CalendarDays className="h-5 w-5 text-[#12231d]" />
          </div>

          <div>
            <h2 className="font-semibold text-[#12231d]">
              Block off dates
            </h2>

            <p className="text-sm text-gray-500">
              Use this for maintenance or personal use —
              these dates won&apos;t be bookable.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleAddBlock}
          className="grid grid-cols-1 gap-3 sm:grid-cols-4"
        >
          {/* Start date */}
          <input
            type="date"
            required
            disabled={addingBlock}
            aria-label="Start date"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] shadow-sm outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-[#ec1561] focus:ring-2 focus:ring-[#ec1561]/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            value={blockForm.start_date}
            onChange={(e) =>
              setBlockForm((f) => ({
                ...f,
                start_date: e.target.value,
              }))
            }
          />

          {/* End date */}
          <input
            type="date"
            required
            disabled={addingBlock}
            aria-label="End date"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] shadow-sm outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-[#ec1561] focus:ring-2 focus:ring-[#ec1561]/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            value={blockForm.end_date}
            onChange={(e) =>
              setBlockForm((f) => ({
                ...f,
                end_date: e.target.value,
              }))
            }
          />

          {/* Reason */}
          <input
            disabled={addingBlock}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] shadow-sm outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-[#ec1561] focus:ring-2 focus:ring-[#ec1561]/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 sm:col-span-1"
            placeholder="Reason (optional)"
            value={blockForm.reason}
            onChange={(e) =>
              setBlockForm((f) => ({
                ...f,
                reason: e.target.value,
              }))
            }
          />

          {/* Block button */}
          <button
            type="submit"
            disabled={addingBlock}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#12231d] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1b3028] focus:outline-none focus:ring-2 focus:ring-[#12231d]/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addingBlock ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Blocking...
              </>
            ) : (
              "Block dates"
            )}
          </button>
        </form>

        {/* Blocked dates */}
        {blocks.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {blocks.map((b) => {
              const removing =
                removingBlockId === b.id;

              return (
                <li
                  key={b.id}
                  className={`flex items-center justify-between gap-4 py-3 text-sm transition-opacity ${
                    removing ? "opacity-50" : ""
                  }`}
                >
                  <span className="text-[#12231d]">
                    {b.start_date} → {b.end_date}

                    {b.reason && (
                      <span className="text-gray-500">
                        {" "}
                        · {b.reason}
                      </span>
                    )}
                  </span>

                  <button
                    disabled={removing}
                    onClick={() =>
                      handleRemoveBlock(b.id)
                    }
                    className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-red-500 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {removing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

