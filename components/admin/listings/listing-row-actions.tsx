// components/admin/listings/listing-row-actions.tsx
"use client";

import { useTransition } from "react";
import {
  reinstateListing,
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
  const [isPending, startTransition] = useTransition();

  const btn = (label: string, action: () => void, color: string) => (
    <button
      disabled={isPending}
      onClick={() => startTransition(action)}
      className={`text-xs px-3 py-1.5 rounded text-white disabled:opacity-50 ${color}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex gap-2">
      {status === "draft" && (
        <>
          {btn("Approve", () => reinstateListing(listingId), "bg-green-600 hover:bg-green-700")}
          {btn("Reject", () => rejectListing(listingId), "bg-gray-500 hover:bg-gray-600")}
        </>
      )}
      {status === "published" && (
        <>
          {btn("Archive", () => archiveListing(listingId), "bg-gray-500 hover:bg-gray-600")}
          {btn("Suspend", () => suspendListing(listingId), "bg-red-600 hover:bg-red-700")}
        </>
      )}
      {status === "archived" && (
        <span className="text-xs text-gray-400">Host can restore</span>
      )}
      {status === "suspended" && (
        <>
          {btn("Reinstate", () => reinstateListing(listingId), "bg-blue-600 hover:bg-blue-700")}
        </>
      )}
    </div>
  );
}