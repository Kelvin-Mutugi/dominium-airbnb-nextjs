"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
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

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    setError(null);

    try {
      for (const file of files) {
        const image = await uploadAdminListingImage(listingId, file);
        setImages((current) => [...current, image].sort((first, second) => first.sort_order - second.sort_order));
      }
    } catch (err) {
      console.error("Failed to upload listing image:", err);
      setError(err instanceof Error ? err.message : "Unable to upload images.");
    } finally {
      setBusy(false);
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