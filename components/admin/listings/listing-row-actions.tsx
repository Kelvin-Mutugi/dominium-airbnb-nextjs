// components/admin/listings/listing-row-actions.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveListing,
  reinstateListing,
  restoreArchivedListing,
  rejectListing,
  archiveListing,
  suspendListing,
} from "@/app/admin/listings/actions";

export function ListingRowActions({
  listingId,
  status,
}: {
  listingId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const runAction = (label: string, action: () => Promise<void>, confirmation: string) => {
    if (!window.confirm(confirmation)) return;
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : `Unable to ${label.toLowerCase()} listing.`);
      }
    });
  };

  const btn = (label: string, action: () => Promise<void>, color: string, confirmation: string) => (
    <button
      type="button"
      disabled={isPending}
      onClick={() => runAction(label, action, confirmation)}
      className={`text-xs px-3 py-1.5 rounded text-white disabled:opacity-50 ${color}`}
    >
      {isPending ? "Working..." : label}
    </button>
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
      {(status === "draft" || status === "pending_review") && (
        <>
          {btn("Approve", () => approveListing(listingId), "bg-green-600 hover:bg-green-700", "Publish this listing now?")}
          {btn("Reject", () => rejectListing(listingId), "bg-gray-500 hover:bg-gray-600", "Reject this listing and move it to Draft?")}
        </>
      )}
      {status === "published" && (
        <>
          {btn("Archive", () => archiveListing(listingId), "bg-gray-500 hover:bg-gray-600", "Archive this published listing?")}
          {btn("Suspend", () => suspendListing(listingId), "bg-red-600 hover:bg-red-700", "Suspend this published listing? It will no longer be available to guests.")}
        </>
      )}
      {status === "archived" && (
        btn("Restore", () => restoreArchivedListing(listingId), "bg-blue-600 hover:bg-blue-700", "Restore and publish this archived listing?")
      )}
      {status === "suspended" && (
        <>
          {btn("Reinstate", () => reinstateListing(listingId), "bg-blue-600 hover:bg-blue-700", "Reinstate and publish this suspended listing?")}
        </>
      )}
      </div>
      {error && <p role="alert" className="max-w-64 text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}