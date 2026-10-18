"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import {
  saveHostListingImageArrangement,
  type HostListingImageArrangement,
} from "@/app/lib/host/actions";
import type { ListingImage } from "@/app/lib/host/types";
import { ListingImageManager } from "@/components/admin/listings/Listingimagemanager";
import {
  buildImagePlan,
  buildSlots,
  buildUploadPlan,
  ensureCover,
  MAX_ROOMS,
  type CategoryKey,
  type RoomCounts,
  type StagedImage,
} from "@/components/admin/listings/image-categories";
import { uploadHostListingImage } from "@/components/host/upload-host-listing-image";

const UPLOAD_CONCURRENCY = 3;
const MAX_PHOTOS = 40;
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

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3124a]";

type HostListingPhoto = ListingImage & {
  position?: number | null;
  category?: string | null;
  room_index?: number | null;
  caption?: string | null;
  is_cover?: boolean | null;
  width?: number | null;
  height?: number | null;
};

type UploadProgress = {
  phase: "uploading" | "finalizing";
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
  bedrooms: number,
  bathrooms: number,
  images: HostListingPhoto[],
): RoomCounts {
  return {
    bedrooms: boundedRoomCount(
      Math.max(
        bedrooms,
        ...images
          .filter((image) => image.category === "bedroom")
          .map((image) => Number(image.room_index) || 1),
      ),
    ),
    bathrooms: boundedRoomCount(
      Math.max(
        bathrooms,
        ...images
          .filter((image) => image.category === "bathroom")
          .map((image) => Number(image.room_index) || 1),
      ),
    ),
  };
}

function slotForImage(image: HostListingPhoto) {
  const category = image.category;
  if (!category || !IMAGE_CATEGORIES.has(category as CategoryKey)) return null;
  if (category === "bedroom" || category === "bathroom") {
    const roomIndex = Number(image.room_index);
    return Number.isInteger(roomIndex) && roomIndex >= 1 && roomIndex <= MAX_ROOMS
      ? `${category}:${roomIndex}`
      : null;
  }
  return category;
}

function toStagedImage(image: HostListingPhoto): StagedImage {
  const position = image.position ?? image.sort_order ?? 0;
  return {
    id: image.id,
    persistedImageId: image.id,
    file: null,
    position,
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
    isCover: image.is_cover === true || position === 0,
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

export function HostListingImages({
  listingId,
  bedrooms,
  bathrooms,
  initialImages,
}: {
  listingId: string;
  bedrooms: number;
  bathrooms: number;
  initialImages: HostListingPhoto[];
}) {
  const router = useRouter();
  const originalRooms = initialRoomCounts(bedrooms, bathrooms, initialImages);
  const originalStagedImages = ensureCover(initialImages.map(toStagedImage));
  const [originalPhotoState, setOriginalPhotoState] = useState(() =>
    photoStateSignature(originalStagedImages, originalRooms),
  );
  const [images, setImages] = useState<StagedImage[]>(originalStagedImages);
  const [rooms, setRooms] = useState<RoomCounts>(originalRooms);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const slots = useMemo(() => buildSlots(rooms), [rooms]);
  const orderedImages = useMemo(
    () => buildImagePlan(images, slots),
    [images, slots],
  );
  const uploadPlan = useMemo(
    () => buildUploadPlan(images, slots),
    [images, slots],
  );
  const hasEdits = photoStateSignature(images, rooms) !== originalPhotoState;
  const unsortedCount = images.filter((image) => !image.slot).length;

  useEffect(() => {
    if (!busy && !hasEdits) return;

    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [busy, hasEdits]);

  async function saveGallery() {
    const unsortedCount = images.filter((image) => !image.slot).length;
    if (unsortedCount > 0) {
      setError(
        `Sort ${unsortedCount} photo${unsortedCount === 1 ? "" : "s"} into a room before saving. Guests browse the gallery room by room.`,
      );
      return;
    }
    if (images.length > 40) {
      setError("A listing can have no more than 40 photos.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);
    let completedBytes = 0;
    let completedFiles = 0;
    let cursor = 0;
    let nextTemporaryPosition =
      images.reduce((maximum, image) => Math.max(maximum, image.position ?? -1), -1) +
      1;
    const inFlight = new Map<number, number>();
    const uploadedIds = new Map<string, string>();
    const uploadedUrls = new Map<string, string>();
    const failedNames: string[] = [];
    let lastFailure: unknown = null;

    setProgress({
      phase: "uploading",
      completedBytes: 0,
      inFlightBytes: 0,
      completedFiles: 0,
      totalBytes: uploadPlan.reduce(
        (total, item) => total + item.file.size,
        0,
      ),
      totalFiles: uploadPlan.length,
    });

    const publish = () =>
      setProgress((current) =>
        current && {
          ...current,
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
        const temporaryPosition = nextTemporaryPosition++;
        try {
          const savedImage = await uploadHostListingImage(
            listingId,
            item.file,
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
          uploadedUrls.set(item.clientId, savedImage.url);
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
          completedBytes += item.file.size;
          completedFiles += 1;
        } catch (uploadError) {
          console.error("Host listing photo upload failed:", item.file.name, uploadError);
          failedNames.push(item.file.name);
          lastFailure = uploadError;
        } finally {
          inFlight.delete(index);
          publish();
        }
      }
    }

    try {
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
          `${failedNames.length} photo${failedNames.length === 1 ? "" : "s"} could not be uploaded (${shown}${extra}). ${lastFailure instanceof Error ? lastFailure.message : "Retry the remaining photos."}`,
        );
        return;
      }

      setProgress({
        phase: "finalizing",
        completedBytes,
        inFlightBytes: 0,
        completedFiles,
        totalBytes: uploadPlan.reduce(
          (total, item) => total + item.file.size,
          0,
        ),
        totalFiles: uploadPlan.length,
      });
      const arrangement: HostListingImageArrangement[] = orderedImages.map(
        (image) => {
          const id = image.persistedImageId ?? uploadedIds.get(image.clientId);
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
      await saveHostListingImageArrangement(listingId, arrangement);

      const committedImages: StagedImage[] = orderedImages.map((image) => {
        const source = images.find((entry) => entry.id === image.clientId);
        const id = image.persistedImageId ?? uploadedIds.get(image.clientId);
        if (!id || !source) {
          throw new Error("Unable to update the saved photo gallery.");
        }
        return {
          ...source,
          id,
          persistedImageId: id,
          file: null,
          previewUrl: uploadedUrls.get(image.clientId) ?? source.previewUrl,
          position: image.position,
          slot:
            image.roomIndex === null
              ? image.category
              : `${image.category}:${image.roomIndex}`,
          caption: image.caption,
          isCover: image.isCover,
        };
      });
      setImages(committedImages);
      setOriginalPhotoState(photoStateSignature(committedImages, rooms));
      setSuccess("Photo gallery saved.");
      router.refresh();
    } catch (saveError) {
      console.error("Failed to save host listing photo gallery:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the photo gallery.",
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const percent =
    progress && progress.totalBytes > 0
      ? Math.min(
          100,
          Math.round(
            ((progress.completedBytes + progress.inFlightBytes) /
              progress.totalBytes) *
              100,
          ),
        )
      : 0;

  return (
    <section
      aria-label="Listing photos"
      className="rounded-2xl border border-[#E9E6DD] bg-white p-4 shadow-[0_1px_2px_rgba(18,35,29,0.04)] sm:p-5"
    >
      {/* Summary: how the gallery looks right now */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <span className="rounded-full bg-[#F7F5EF] px-3 py-1 text-sm font-medium text-gray-700">
            {images.length} of {MAX_PHOTOS} photos
          </span>
          {unsortedCount > 0 ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
              {unsortedCount} {unsortedCount === 1 ? "photo needs" : "photos need"} a
              room
            </span>
          ) : images.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Every photo has a room
            </span>
          ) : null}
        </div>

        <details className="group relative">
          <summary
            className={`flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#a3124a] hover:bg-[#FFF5F8] [&::-webkit-details-marker]:hidden ${FOCUS}`}
          >
            How this works
            <ChevronDown
              className="h-4 w-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ol className="mt-2 w-full space-y-1.5 rounded-xl bg-[#F7F5EF] p-4 text-sm leading-6 text-gray-700 sm:absolute sm:right-0 sm:z-10 sm:w-80 sm:shadow-lg sm:ring-1 sm:ring-[#E9E6DD]">
            <li>
              <span className="font-semibold text-[#12231d]">1. Add photos.</span>{" "}
              Pick as many as you like, up to {MAX_PHOTOS}.
            </li>
            <li>
              <span className="font-semibold text-[#12231d]">
                2. Put each photo in its room.
              </span>{" "}
              Guests browse the gallery room by room.
            </li>
            <li>
              <span className="font-semibold text-[#12231d]">
                3. Choose a cover photo.
              </span>{" "}
              This is the first picture guests see.
            </li>
            <li>
              <span className="font-semibold text-[#12231d]">4. Save.</span>{" "}
              Your changes go live when you save the gallery.
            </li>
          </ol>
        </details>
      </div>

      {progress && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-xl border border-[#E9E6DD] bg-[#FBFAF6] px-4 py-3"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-[#12231d]">
            <Loader2
              className="h-4 w-4 animate-spin text-[#a3124a]"
              aria-hidden="true"
            />
            {progress.phase === "uploading"
              ? `Uploading photos (${progress.completedFiles} of ${progress.totalFiles} done)`
              : "Saving photo order and room details"}
          </p>
          <div
            role="progressbar"
            aria-label="Photo gallery save progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              progress.phase === "uploading" && progress.totalBytes > 0
                ? percent
                : undefined
            }
            className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#E9E6DD]"
          >
            <div
              className="h-full rounded-full bg-[#a3124a] transition-[width] duration-150"
              style={{
                width:
                  progress.phase === "finalizing"
                    ? "100%"
                    : progress.totalBytes > 0
                      ? `${percent}%`
                      : "0%",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-600">
            Please keep this page open until your photos finish saving.
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {success}
        </p>
      )}

      <div className="mt-5">
        <ListingImageManager
          images={images}
          setImages={(value) => {
            setSuccess(null);
            setImages(value);
          }}
          rooms={rooms}
          setRooms={(value) => {
            setSuccess(null);
            setRooms(value);
          }}
          disabled={busy}
        />
      </div>

      {/* Floating save bar: stays in view while the host works through photos */}
      {(hasEdits || busy) && (
        <div
          role="region"
          aria-label="Save photo changes"
          className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#12231d] px-4 py-3 text-white shadow-lg"
        >
          <p className="text-sm font-medium">
            {busy
              ? "Saving your photos…"
              : unsortedCount > 0
                ? `${unsortedCount} ${unsortedCount === 1 ? "photo still needs" : "photos still need"} a room`
                : "You have unsaved photo changes"}
          </p>
          <button
            type="button"
            onClick={saveGallery}
            disabled={busy || !hasEdits}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#12231d] transition hover:bg-[#F7F5EF] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`}
          >
            {busy && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {busy ? "Saving photos…" : "Save photo gallery"}
          </button>
        </div>
      )}
    </section>
  );
}