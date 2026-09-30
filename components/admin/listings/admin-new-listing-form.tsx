"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { Images, Trash2, Upload } from "lucide-react";
import { createAdminListing } from "@/app/admin/listings/actions";
import { linkCreatedListingToHostRequest } from "@/app/admin/listing-requests/actions";
import type { ListingFormValues } from "@/app/lib/host/types";
import { uploadAdminListingImage } from "@/components/admin/listings/upload-admin-listing-image";
import ListingForm from "@/components/host/ListingForm";

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
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [createdListingNotice, setCreatedListingNotice] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const validFiles = files.filter(
      (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= 10 * 1024 * 1024,
    );

    setSelectedImages((current) => [...current, ...validFiles]);
    setError(validFiles.length === files.length ? null : "Choose JPG, PNG, or WebP images up to 10 MB each.");
  }

  async function handleSubmit(values: ListingFormValues) {
    if (!hostId.trim()) {
      setError("Select the host before creating the listing.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const listing = await createAdminListing(hostId, values);

      try {
        for (const file of selectedImages) {
          await uploadAdminListingImage(listing.id, file);
        }
      } catch (uploadError) {
        console.error("Listing created, but image upload failed:", uploadError);
        setCreatedListingId(listing.id);
        setCreatedListingNotice("The listing was created, but an image did not upload. Add the remaining images from the listing editor.");
        setError(uploadError instanceof Error ? uploadError.message : "Unable to upload listing images.");
        return;
      }

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/admin/listings" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to listings
        </Link>
        <h1 className="text-2xl font-bold text-[#12231d]">Add listing for review</h1>
        <p className="text-gray-500">Admin fills in the property details on behalf of the host and submits it for review.</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-[#12231d]">Host ID</label>
        <input
          value={hostId}
          onChange={(event) => setHostId(event.target.value)}
          placeholder="Paste host user ID"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#ec1561] focus:outline-none focus:ring-1 focus:ring-[#ec1561]"
        />
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Images size={18} className="text-gray-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[#12231d]">Listing images</h2>
          </div>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-[#1B1A2E] hover:bg-gray-50"
          >
            <Upload size={16} aria-hidden="true" />
            Choose images
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={selectImages}
            className="sr-only"
            tabIndex={-1}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP. Maximum 10 MB per image.</p>
        {selectedImages.length > 0 && (
          <ul className="mt-3 divide-y divide-gray-100 rounded-md border border-gray-100">
            {selectedImages.map((file, index) => (
              <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
                  <Images size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-gray-400">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}
                  aria-label={`Remove ${file.name}`}
                  title="Remove image"
                  className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <ListingForm
        onSubmit={handleSubmit}
        submitLabel={submitting ? "Saving..." : "Create listing for review"}
      />
    </div>
  );
}