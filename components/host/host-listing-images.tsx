"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import { Star, Trash2, Upload } from "lucide-react";
import {
  deleteHostListingImage,
  setHostListingImageCover,
} from "@/app/lib/host/actions";
import { uploadHostListingImage } from "@/components/host/upload-host-listing-image";

type ListingImage = {
  id: string;
  url: string;
  sort_order: number;
};

export function HostListingImages({
  listingId,
  initialImages,
}: {
  listingId: string;
  initialImages: ListingImage[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState(initialImages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    completedBytes: number;
    currentFileBytes: number;
    currentFile: number;
    totalBytes: number;
    totalFiles: number;
  } | null>(null);

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    setError(null);
    let completedBytes = 0;
    setProgress({
      completedBytes: 0,
      currentFileBytes: 0,
      currentFile: 1,
      totalBytes: files.reduce((total, file) => total + file.size, 0),
      totalFiles: files.length,
    });

    try {
      for (const [index, file] of files.entries()) {
        setProgress((current) =>
          current && { ...current, currentFile: index + 1, currentFileBytes: 0 },
        );
        const image = await uploadHostListingImage(
          listingId,
          file,
          (currentFileBytes) =>
            setProgress(
              (current) => current && { ...current, currentFileBytes },
            ),
        );
        completedBytes += file.size;
        setProgress(
          (current) =>
            current && { ...current, completedBytes, currentFileBytes: 0 },
        );
        setImages((current) =>
          [...current, image].sort(
            (first, second) => first.sort_order - second.sort_order,
          ),
        );
      }
    } catch (uploadError) {
      console.error("Failed to upload host listing image:", uploadError);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload images.",
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function removeImage(imageId: string) {
    setBusy(true);
    setError(null);
    try {
      const warning = await deleteHostListingImage(imageId);
      setImages((current) => current.filter((image) => image.id !== imageId));
      if (warning) setError(warning);
    } catch (removeError) {
      console.error("Failed to remove host listing image:", removeError);
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove image.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function makeCoverImage(imageId: string) {
    setBusy(true);
    setError(null);
    try {
      await setHostListingImageCover(listingId, imageId);
      setImages((current) =>
        [...current]
          .sort((first, second) =>
            first.id === imageId
              ? -1
              : second.id === imageId
                ? 1
                : first.sort_order - second.sort_order,
          )
          .map((image, sort_order) => ({ ...image, sort_order })),
      );
    } catch (coverError) {
      console.error("Failed to set host listing cover image:", coverError);
      setError(
        coverError instanceof Error
          ? coverError.message
          : "Unable to set cover image.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#E9E6DD] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#12231d]">
            Listing images
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Add JPG, PNG, or WebP photos up to 10 MB each.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#E23E85] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c93075] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload size={16} aria-hidden="true" />
          {busy ? "Uploading..." : "Add images"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={uploadImages}
          className="sr-only"
          tabIndex={-1}
        />
      </div>

      {progress && (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          <p className="font-medium">
            Uploading image {progress.currentFile} of {progress.totalFiles}...
          </p>
          <div
            role="progressbar"
            aria-label="Image upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              progress.totalBytes > 0
                ? Math.round(
                    ((progress.completedBytes + progress.currentFileBytes) /
                      progress.totalBytes) *
                      100,
                  )
                : 0
            }
            className="mt-2 h-2 overflow-hidden rounded-full bg-amber-200"
          >
            <div
              className="h-full rounded-full bg-[#E23E85] transition-[width] duration-150"
              style={{
                width: `${
                  progress.totalBytes > 0
                    ? Math.round(
                        ((progress.completedBytes + progress.currentFileBytes) /
                          progress.totalBytes) *
                          100,
                      )
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs">
            Please keep this page open until the images finish uploading.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {images.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-md border border-gray-200"
            >
              <Image
                src={image.url}
                alt={`Listing image ${index + 1}`}
                width={640}
                height={480}
                unoptimized
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="text-xs text-gray-500">
                  {image.sort_order === 0 ? "Cover image" : `Image ${index + 1}`}
                </span>
                <div className="flex items-center gap-1">
                  {image.sort_order !== 0 && (
                    <button
                      type="button"
                      onClick={() => makeCoverImage(image.id)}
                      disabled={busy}
                      aria-label={`Set image ${index + 1} as cover`}
                      title="Set as cover"
                      className="rounded p-1 text-gray-500 hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Star size={16} aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    disabled={busy}
                    aria-label={`Remove image ${index + 1}`}
                    title="Remove image"
                    className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          No images added to this listing yet.
        </p>
      )}
    </section>
  );
}
