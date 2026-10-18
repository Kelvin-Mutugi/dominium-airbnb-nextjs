"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createAdminListing } from "@/app/admin/listings/actions";
import { linkCreatedListingToHostRequest } from "@/app/admin/listing-requests/actions";
import type { ListingFormValues } from "@/app/lib/host/types";
import { uploadAdminListingImage } from "@/components/admin/listings/upload-admin-listing-image";
import { ListingImageManager } from "@/components/admin/listings/Listingimagemanager";
import {
  buildSlots,
  buildUploadPlan,
  type RoomCounts,
  type StagedImage,
} from "@/components/admin/listings/image-categories";
import ListingForm from "@/components/host/ListingForm";

const UPLOAD_CONCURRENCY = 3;

type UploadProgress = {
  phase: "creating" | "uploading" | "finalizing";
  completedBytes: number;
  inFlightBytes: number;
  completedFiles: number;
  totalBytes: number;
  totalFiles: number;
};

export function AdminNewListingForm({
  initialHostId,
  intakeRequestId,
}: {
  initialHostId: string;
  intakeRequestId?: string | null;
}) {
  const router = useRouter();
  const [hostId, setHostId] = useState(initialHostId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<StagedImage[]>([]);
  const [rooms, setRooms] = useState<RoomCounts>({ bedrooms: 1, bathrooms: 1 });
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [createdListingNotice, setCreatedListingNotice] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const slots = useMemo(() => buildSlots(rooms), [rooms]);
  const hasStagedImages = images.length > 0;

  useEffect(() => {
    if (!submitting && !hasStagedImages) return;

    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [submitting, hasStagedImages]);

  async function handleSubmit(values: ListingFormValues) {
    if (!hostId.trim()) {
      setError("Select the host before creating the listing.");
      return;
    }

    const unsortedCount = images.filter((image) => !image.slot).length;
    if (unsortedCount > 0) {
      setError(
        `Sort ${unsortedCount} photo${unsortedCount === 1 ? "" : "s"} into a room first. Guests browse the gallery room by room.`,
      );
      return;
    }

    const plan = buildUploadPlan(images, slots);

    try {
      setSubmitting(true);
      setError(null);
      setUploadProgress({
        phase: "creating",
        completedBytes: 0,
        inFlightBytes: 0,
        completedFiles: 0,
        totalBytes: plan.reduce((total, item) => total + item.file.size, 0),
        totalFiles: plan.length,
      });
      const listing = await createAdminListing(hostId, values);

      let completedBytes = 0;
      let completedFiles = 0;
      let cursor = 0;
      const inFlight = new Map<number, number>();
      const failedNames: string[] = [];
      let lastFailure: unknown = null;

      const publish = () =>
        setUploadProgress((current) =>
          current && {
            ...current,
            phase: "uploading",
            completedBytes,
            completedFiles,
            inFlightBytes: [...inFlight.values()].reduce((sum, bytes) => sum + bytes, 0),
          },
        );

      async function worker() {
        while (cursor < plan.length) {
          const index = cursor++;
          const item = plan[index];
          try {
            await uploadAdminListingImage(
              listing.id,
              item.file,
              (currentFileBytes: number) => {
                inFlight.set(index, currentFileBytes);
                publish();
              },
              {
                category: item.category,
                roomIndex: item.roomIndex,
                caption: item.caption,
                position: item.position,
                isCover: item.isCover,
                width: item.width,
                height: item.height,
              },
            );
            completedBytes += item.file.size;
            completedFiles += 1;
          } catch (uploadError) {
            console.error("Image upload failed:", item.file.name, uploadError);
            failedNames.push(item.file.name);
            lastFailure = uploadError;
          } finally {
            inFlight.delete(index);
            publish();
          }
        }
      }

      if (plan.length > 0) {
        publish();
        await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, plan.length) }, worker));
      }

      if (failedNames.length > 0) {
        const shown = failedNames.slice(0, 3).join(", ");
        const extra = failedNames.length > 3 ? ` and ${failedNames.length - 3} more` : "";
        setCreatedListingId(listing.id);
        setCreatedListingNotice(
          `The listing was created, but ${failedNames.length} of ${plan.length} photos did not upload (${shown}${extra}). Add them from the listing editor.`,
        );
        setError(lastFailure instanceof Error ? lastFailure.message : "Unable to upload some listing images.");
        return;
      }

      setUploadProgress((current) => current && { ...current, phase: "finalizing" });
      if (intakeRequestId) {
        try {
          await linkCreatedListingToHostRequest(intakeRequestId, listing.id);
        } catch (linkError) {
          console.error("Listing created, but property request could not be linked:", linkError);
          setCreatedListingId(listing.id);
          setCreatedListingNotice("The listing was created, but the property request could not be linked. You can link it from the request queue.");
          setError(linkError instanceof Error ? linkError.message : "Unable to update property request.");
          return;
        }
      }

      router.push(`/admin/listings/${listing.id}`);
    } catch (err) {
      console.error("Failed to create listing:", err);
      setError(err instanceof Error ? err.message : "Unable to create listing.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  if (createdListingId) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {createdListingNotice}
          {error && <span className="mt-1 block text-red-700">{error}</span>}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/listings/${createdListingId}/edit`}
            className="rounded-lg bg-[#E23E85] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c93075]"
          >
            Continue editing listing
          </Link>
          <Link
            href={`/admin/listings/${createdListingId}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1B1A2E] hover:bg-gray-50"
          >
            View listing
          </Link>
        </div>
      </div>
    );
  }

  const percent =
    uploadProgress && uploadProgress.totalBytes > 0
      ? Math.min(100, Math.round(((uploadProgress.completedBytes + uploadProgress.inFlightBytes) / uploadProgress.totalBytes) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/admin/listings" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to listings
        </Link>
        <h1 className="text-2xl font-bold text-[#12231d]">Add listing for review</h1>
        <p className="text-gray-500">Admin fills in the property details on behalf of the host and submits it for review.</p>
      </div>

      {uploadProgress && (
        <div role="status" aria-live="polite" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">
            {uploadProgress.phase === "creating" && "Saving listing details..."}
            {uploadProgress.phase === "uploading" &&
              `Uploading photos (${uploadProgress.completedFiles} of ${uploadProgress.totalFiles} done)...`}
            {uploadProgress.phase === "finalizing" && "Finishing listing setup..."}
          </p>
          <div
            role="progressbar"
            aria-label="Listing upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadProgress.phase === "uploading" && uploadProgress.totalBytes > 0 ? percent : undefined}
            aria-valuetext={uploadProgress.phase === "uploading" && uploadProgress.totalBytes > 0 ? `${percent}% uploaded` : "In progress"}
            className="mt-2 h-2 overflow-hidden rounded-full bg-amber-200"
          >
            <div
              className={`h-full rounded-full bg-[#E23E85] transition-[width] duration-150 motion-reduce:transition-none ${uploadProgress.phase === "creating" ? "w-1/3 animate-pulse" : ""}`}
              style={
                uploadProgress.phase === "uploading" && uploadProgress.totalBytes > 0
                  ? { width: `${percent}%` }
                  : uploadProgress.phase === "finalizing"
                    ? { width: "100%" }
                    : undefined
              }
            />
          </div>
          <p className="mt-2 text-xs">Please keep this page open until the listing finishes uploading.</p>
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-[#12231d]">Host ID</label>
        <input
          value={hostId}
          onChange={(event) => setHostId(event.target.value)}
          disabled={submitting}
          placeholder="Paste host user ID"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#ec1561] focus:outline-none focus:ring-1 focus:ring-[#ec1561]"
        />
      </div>

      <ListingImageManager
        images={images}
        setImages={setImages}
        rooms={rooms}
        setRooms={setRooms}
        disabled={submitting}
      />

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <ListingForm
        onSubmit={handleSubmit}
        requireMapPin
        submitLabel={submitting ? "Saving..." : "Create listing for review"}
      />
    </div>
  );
}