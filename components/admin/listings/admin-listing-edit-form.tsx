"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateAdminListing } from "@/app/admin/listings/actions";
import type { ListingFormValues } from "@/app/lib/host/types";
import ListingForm from "@/components/host/ListingForm";

export function AdminListingEditForm({
  listingId,
  initialValues,
}: {
  listingId: string;
  initialValues: ListingFormValues;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: ListingFormValues) {
    try {
      setSubmitting(true);
      setError(null);
      await updateAdminListing(listingId, values);
      router.push(`/admin/listings/${listingId}`);
      router.refresh();
    } catch (err) {
      console.error("Failed to update listing:", err);
      setError(err instanceof Error ? err.message : "Unable to update listing.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      <ListingForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitLabel={submitting ? "Saving..." : "Save listing changes"}
      />
    </div>
  );
}