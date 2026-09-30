"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleAdminListingPublication } from "@/app/admin/listings/actions";

export function ListingPublicationToggle({
  listingId,
  status,
}: {
  listingId: string;
  status: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canToggle = status === "published" || status === "draft" || status === "pending_review";
  const actionLabel = status === "published" ? "Unpublish listing" : "Publish listing";

  function toggle() {
    const confirmation = status === "published"
      ? "Unpublish this listing? Guests will no longer be able to book it."
      : "Publish this listing so guests can find and book it?";
    if (!window.confirm(confirmation)) return;

    setError(null);
    startTransition(async () => {
      try {
        await toggleAdminListingPublication(listingId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update listing status.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {canToggle ? (
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          aria-label={actionLabel}
          title={actionLabel}
          className={`rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors disabled:cursor-wait disabled:opacity-60 ${
            status === "published"
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {isPending ? "Updating..." : status?.replaceAll("_", " ")}
        </button>
      ) : (
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium capitalize text-gray-700">
          {status?.replaceAll("_", " ") ?? "Unknown"}
        </span>
      )}
      {error && <span role="alert" className="max-w-56 text-right text-xs text-red-600">{error}</span>}
    </div>
  );
}