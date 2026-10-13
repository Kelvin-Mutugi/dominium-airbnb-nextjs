"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Trash2, Upload } from "lucide-react";
import { deleteAdminListingImage } from "@/app/admin/listings/actions";
import { uploadAdminListingImage } from "@/components/admin/listings/upload-admin-listing-image";

type ListingImage = {
  id: string;
  url: string;
  sort_order: number;
};

export function AdminListingImages({
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
  const [uploadProgress, setUploadProgress] = useState<{
    completedBytes: number;
    currentFileBytes: number;
    currentFile: number;
    totalBytes: number;
    totalFiles: number;
  } | null>(null);

  useEffect(() => {
    if (!busy) return;

    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [busy]);

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    setError(null);
    let completedBytes = 0;
    setUploadProgress({
      completedBytes: 0,
      currentFileBytes: 0,
      currentFile: 1,
      totalBytes: files.reduce((total, file) => total + file.size, 0),
      totalFiles: files.length,
    });

    try {
      for (const [index, file] of files.entries()) {
        setUploadProgress((current) => current && {
          ...current,
          currentFile: index + 1,
          currentFileBytes: 0,
        });
        const image = await uploadAdminListingImage(listingId, file, (currentFileBytes) => {
          setUploadProgress((current) => current && { ...current, currentFileBytes });
        });
        completedBytes += file.size;
        setUploadProgress((current) => current && {
          ...current,
          completedBytes,
          currentFileBytes: 0,
        });
        setImages((current) => [...current, image].sort((first, second) => first.sort_order - second.sort_order));
      }
    } catch (err) {
      console.error("Failed to upload listing image:", err);
      setError(err instanceof Error ? err.message : "Unable to upload images.");
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  async function removeImage(imageId: string) {
    setBusy(true);
    setError(null);

    try {
      await deleteAdminListingImage(imageId);
      setImages((current) => current.filter((image) => image.id !== imageId));
    } catch (err) {
      console.error("Failed to remove listing image:", err);
      setError(err instanceof Error ? err.message : "Unable to remove image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#1B1A2E]">Listing images</h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-[#E23E85] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c93075] disabled:cursor-not-allowed disabled:opacity-60"
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

      <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP. Maximum 10 MB per image.</p>
      {uploadProgress && (
        <div role="status" aria-live="polite" className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-medium">Uploading image {uploadProgress.currentFile} of {uploadProgress.totalFiles}...</p>
          <div
            role="progressbar"
            aria-label="Image upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadProgress.totalBytes > 0
              ? Math.round(((uploadProgress.completedBytes + uploadProgress.currentFileBytes) / uploadProgress.totalBytes) * 100)
              : 0}
            className="mt-2 h-2 overflow-hidden rounded-full bg-amber-200"
          >
            <div
              className="h-full rounded-full bg-[#E23E85] transition-[width] duration-150"
              style={{ width: `${uploadProgress.totalBytes > 0
                ? Math.round(((uploadProgress.completedBytes + uploadProgress.currentFileBytes) / uploadProgress.totalBytes) * 100)
                : 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs">Please keep this page open until the images finish uploading.</p>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

      {images.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <div key={image.id} className="overflow-hidden rounded-md border border-gray-200">
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
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          No images added to this listing.
        </p>
      )}
    </section>
  );
}