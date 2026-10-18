"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  saveAdminListingImageArrangement,
  updateAdminListing,
} from "@/app/admin/listings/actions";
import type { AdminListingImageArrangement } from "@/app/admin/listings/actions";
import type { ListingFormValues } from "@/app/lib/host/types";
import type { ListingPhoto } from "@/components/homeData";
import { ListingImageManager } from "@/components/admin/listings/Listingimagemanager";
import { uploadAdminListingImage } from "@/components/admin/listings/upload-admin-listing-image";
import {
  buildImagePlan,
  buildSlots,
  buildUploadPlan,
  MAX_ROOMS,
  type CategoryKey,
  type RoomCounts,
  type StagedImage,
} from "@/components/admin/listings/image-categories";
import ListingForm from "@/components/host/ListingForm";

const UPLOAD_CONCURRENCY = 3;
const IMAGE_CATEGORIES = new Set<CategoryKey>([
  "exterior",
  "living",
  "kitchen",
  "bedroom",
  "bathroom",
  "outdoor",
  "amenities",
  "neighborhood",
]);

type ExistingListingImage = ListingPhoto & { id: string };

type UploadProgress = {
  phase: "saving" | "uploading" | "finalizing";
  completedBytes: number;
  inFlightBytes: number;
  completedFiles: number;
  totalBytes: number;
  totalFiles: number;
};

function boundedRoomCount(value: number) {
  return Math.max(1, Math.min(MAX_ROOMS, Math.floor(value) || 1));
}

function initialRoomCounts(
  values: ListingFormValues,
  images: ExistingListingImage[],
): RoomCounts {
  return {
    bedrooms: boundedRoomCount(
      Math.max(
        values.bedrooms,
        ...images
          .filter((image) => image.category === "bedroom")
          .map((image) => Number(image.roomIndex) || 1),
      ),
    ),
    bathrooms: boundedRoomCount(
      Math.max(
        values.bathrooms,
        ...images
          .filter((image) => image.category === "bathroom")
          .map((image) => Number(image.roomIndex) || 1),
      ),
    ),
  };
}

function slotForImage(image: ExistingListingImage) {
  const category = image.category;
  if (!category || !IMAGE_CATEGORIES.has(category as CategoryKey)) return null;
  if (category === "bedroom" || category === "bathroom") {
    const roomIndex = Number(image.roomIndex);
    return Number.isInteger(roomIndex) && roomIndex >= 1 && roomIndex <= MAX_ROOMS
      ? `${category}:${roomIndex}`
      : null;
  }
  return `${category}`;
}

function toStagedImage(image: ExistingListingImage): StagedImage {
  return {
    id: image.id,
    persistedImageId: image.id,
    file: null,
    position: image.position ?? image.sortOrder ?? undefined,
    previewUrl: image.url,
    slot: slotForImage(image),
    caption: image.caption ?? "",
    width:
      Number.isInteger(image.width) && Number(image.width) > 0
        ? Number(image.width)
        : 1600,
    height:
      Number.isInteger(image.height) && Number(image.height) > 0
        ? Number(image.height)
        : 1200,
    sourceKey: `saved-${image.id}`,
    originalBytes: 0,
    isCover: image.isCover === true,
    warning: null,
  };
}

function photoStateSignature(images: StagedImage[], rooms: RoomCounts) {
  return JSON.stringify({
    rooms,
    images: images.map((image) => ({
      id: image.persistedImageId ?? image.id,
      slot: image.slot,
      caption: image.caption,
      width: image.width,
      height: image.height,
      isCover: image.isCover,
      hasNewFile: image.file !== null,
    })),
  });
}

export function AdminListingEditForm({
  listingId,
  initialValues,
  initialImages,
}: {
  listingId: string;
  initialValues: ListingFormValues;
  initialImages: ExistingListingImage[];
}) {
  const router = useRouter();
  const originalRooms = initialRoomCounts(initialValues, initialImages);
  const originalStagedImages = initialImages.map(toStagedImage);
  const [originalPhotoState] = useState(() =>
    photoStateSignature(originalStagedImages, originalRooms),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<StagedImage[]>(originalStagedImages);
  const [rooms, setRooms] = useState<RoomCounts>(originalRooms);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null,
  );

  const slots = useMemo(() => buildSlots(rooms), [rooms]);
  const orderedImages = useMemo(
    () => buildImagePlan(images, slots),
    [images, slots],
  );
  const uploadPlan = useMemo(
    () => buildUploadPlan(images, slots),
    [images, slots],
  );
  const hasPhotoEdits =
    photoStateSignature(images, rooms) !== originalPhotoState;

  useEffect(() => {
    if (!submitting && !hasPhotoEdits) return;

    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [submitting, hasPhotoEdits]);

  async function handleSubmit(values: ListingFormValues) {
    const unsortedCount = images.filter((image) => !image.slot).length;
    const photoChanges = hasPhotoEdits;
    if (photoChanges && unsortedCount > 0) {
      setError(
        `Sort ${unsortedCount} photo${unsortedCount === 1 ? "" : "s"} into a room first. Guests browse the gallery room by room.`,
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setUploadProgress({
        phase: "saving",
        completedBytes: 0,
        inFlightBytes: 0,
        completedFiles: 0,
        totalBytes: uploadPlan.reduce(
          (total, item) => total + item.file.size,
          0,
        ),
        totalFiles: uploadPlan.length,
      });

      await updateAdminListing(listingId, values);

      let completedBytes = 0;
      let completedFiles = 0;
      let cursor = 0;
      let nextTemporaryPosition =
        images.reduce((maximum, image) => Math.max(maximum, image.position ?? -1), -1) +
        1;
      const inFlight = new Map<number, number>();
      const uploadedIds = new Map<string, string>();
      const failedNames: string[] = [];
      let lastFailure: unknown = null;

      const publish = () =>
        setUploadProgress((current) =>
          current && {
            ...current,
            phase: "uploading",
            completedBytes,
            completedFiles,
            inFlightBytes: [...inFlight.values()].reduce(
              (sum, bytes) => sum + bytes,
              0,
            ),
          },
        );

      async function worker() {
        while (cursor < uploadPlan.length) {
          const index = cursor++;
          const item = uploadPlan[index];
          const file = item.file;
          const temporaryPosition = nextTemporaryPosition++;
          try {
            const savedImage = await uploadAdminListingImage(
              listingId,
              file,
              (currentFileBytes) => {
                inFlight.set(index, currentFileBytes);
                publish();
              },
              {
                category: item.category,
                roomIndex: item.roomIndex,
                caption: item.caption,
                position: temporaryPosition,
                isCover: false,
                width: item.width,
                height: item.height,
              },
            );
            uploadedIds.set(item.clientId, savedImage.id);
            URL.revokeObjectURL(
              images.find((image) => image.id === item.clientId)?.previewUrl ??
                "",
            );
            setImages((current) =>
              current.map((image) =>
                image.id === item.clientId
                  ? {
                      ...image,
                      file: null,
                      persistedImageId: savedImage.id,
                      previewUrl: savedImage.url,
                      position: temporaryPosition,
                    }
                  : image,
              ),
            );
            completedBytes += file.size;
            completedFiles += 1;
          } catch (uploadError) {
            console.error("Image upload failed:", file.name, uploadError);
            failedNames.push(file.name);
            lastFailure = uploadError;
          } finally {
            inFlight.delete(index);
            publish();
          }
        }
      }

      if (uploadPlan.length > 0) {
        publish();
        await Promise.all(
          Array.from(
            { length: Math.min(UPLOAD_CONCURRENCY, uploadPlan.length) },
            worker,
          ),
        );
      }

      if (failedNames.length > 0) {
        const shown = failedNames.slice(0, 3).join(", ");
        const extra =
          failedNames.length > 3 ? ` and ${failedNames.length - 3} more` : "";
        setError(
          `Listing details were saved, but ${failedNames.length} photo${failedNames.length === 1 ? "" : "s"} could not be uploaded (${shown}${extra}). ${lastFailure instanceof Error ? lastFailure.message : "Retry the remaining photos."}`,
        );
        return;
      }

      if (photoChanges) {
        setUploadProgress((current) =>
          current ? { ...current, phase: "finalizing" } : current,
        );
        const arrangement: AdminListingImageArrangement[] = orderedImages.map(
          (image) => {
            const id =
              image.persistedImageId ?? uploadedIds.get(image.clientId);
            if (!id) throw new Error("Unable to resolve a saved listing photo.");
            return {
              id,
              category: image.category,
              roomIndex: image.roomIndex,
              caption: image.caption,
              position: image.position,
              isCover: image.isCover,
              width: image.width,
              height: image.height,
            };
          },
        );
        await saveAdminListingImageArrangement(listingId, arrangement);
      }
      router.push(`/admin/listings/${listingId}`);
      router.refresh();
    } catch (err) {
      console.error("Failed to update listing:", err);
      setError(
        err instanceof Error ? err.message : "Unable to update listing.",
      );
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  const percent =
    uploadProgress && uploadProgress.totalBytes > 0
      ? Math.min(
          100,
          Math.round(
            ((uploadProgress.completedBytes + uploadProgress.inFlightBytes) /
              uploadProgress.totalBytes) *
              100,
          ),
        )
      : 0;

  return (
    <div className="space-y-6">
      {uploadProgress && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p className="font-semibold">
            {uploadProgress.phase === "saving" && "Saving listing details..."}
            {uploadProgress.phase === "uploading" &&
              `Uploading photos (${uploadProgress.completedFiles} of ${uploadProgress.totalFiles} done)...`}
            {uploadProgress.phase === "finalizing" &&
              "Saving photo order and room details..."}
          </p>
          <div
            role="progressbar"
            aria-label="Listing update progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              uploadProgress.phase === "uploading" &&
              uploadProgress.totalBytes > 0
                ? percent
                : undefined
            }
            aria-valuetext={
              uploadProgress.phase === "uploading" &&
              uploadProgress.totalBytes > 0
                ? `${percent}% uploaded`
                : "In progress"
            }
            className="mt-2 h-2 overflow-hidden rounded-full bg-amber-200"
          >
            <div
              className={`h-full rounded-full bg-[#E23E85] transition-[width] duration-150 motion-reduce:transition-none ${
                uploadProgress.phase === "saving" ? "w-1/3 animate-pulse" : ""
              }`}
              style={
                uploadProgress.phase === "uploading" &&
                uploadProgress.totalBytes > 0
                  ? { width: `${percent}%` }
                  : uploadProgress.phase === "finalizing"
                    ? { width: "100%" }
                    : undefined
              }
            />
          </div>
          <p className="mt-2 text-xs">
            Please keep this page open until the listing finishes saving.
          </p>
        </div>
      )}

      <ListingImageManager
        images={images}
        setImages={setImages}
        rooms={rooms}
        setRooms={setRooms}
        disabled={submitting}
      />

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <ListingForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        requireMapPin
        submitLabel={submitting ? "Saving..." : "Save listing changes"}
      />
    </div>
  );
}
