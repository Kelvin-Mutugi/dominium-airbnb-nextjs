"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!submitting) return;

    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [submitting]);

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
      {submitting && (
        <div role="status" aria-live="polite" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Saving listing changes...</p>
          <div role="progressbar" aria-label="Saving listing changes" aria-valuetext="In progress" className="mt-2 h-2 overflow-hidden rounded-full bg-amber-200">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-[#E23E85]" />
          </div>
          <p className="mt-2 text-xs">Please keep this page open until saving is complete.</p>
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      <ListingForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitLabel={submitting ? "Saving..." : "Save listing changes"}
      />
    </div>
  );
}