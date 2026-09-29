"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { updateHostListingRequest } from "@/app/admin/listing-requests/actions";

const STATUSES = ["submitted", "reviewing", "visit_scheduled", "visited", "details_collected", "listing_created", "declined"] as const;

type RequestRow = {
  id: string;
  status: string;
  proposed_visit_at: string | null;
  admin_notes: string | null;
  host_message: string | null;
  listing_id: string | null;
};

export function ListingRequestReviewForm({
  request,
}: {
  request: RequestRow;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await updateHostListingRequest(formData);
        router.refresh();
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : "Unable to update property request.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 border-t pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
      <input type="hidden" name="request_id" value={request.id} />
      <div>
        <label htmlFor={`request-status-${request.id}`} className="block text-xs font-medium text-gray-600">Due diligence status</label>
        <select id={`request-status-${request.id}`} name="status" defaultValue={request.status} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1B1A2E] focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20">
          {STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`request-visit-${request.id}`} className="block text-xs font-medium text-gray-600">Visit date and time</label>
        <input id={`request-visit-${request.id}`} name="proposed_visit_at" type="datetime-local" defaultValue={request.proposed_visit_at ? new Date(new Date(request.proposed_visit_at).getTime() - new Date(request.proposed_visit_at).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : ""} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1B1A2E] focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
      </div>
      <div>
        <label htmlFor={`request-listing-${request.id}`} className="block text-xs font-medium text-gray-600">Created listing ID (optional)</label>
        <input id={`request-listing-${request.id}`} name="listing_id" type="text" defaultValue={request.listing_id ?? ""} placeholder="Paste listing ID after creation" className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1B1A2E] placeholder:text-gray-400 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
      </div>
      <div>
        <label htmlFor={`request-host-message-${request.id}`} className="block text-xs font-medium text-gray-600">Update for host</label>
        <textarea id={`request-host-message-${request.id}`} name="host_message" maxLength={1000} rows={2} defaultValue={request.host_message ?? ""} placeholder="Share visit arrangements, progress, or next steps" className="mt-1 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1B1A2E] placeholder:text-gray-400 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
      </div>
      <div>
        <label htmlFor={`request-notes-${request.id}`} className="block text-xs font-medium text-gray-600">Internal notes / host update</label>
        <textarea id={`request-notes-${request.id}`} name="admin_notes" maxLength={3000} rows={4} defaultValue={request.admin_notes ?? ""} placeholder="Record visit outcome, missing details, or next steps" className="mt-1 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1B1A2E] placeholder:text-gray-400 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={isPending} className="rounded-md bg-[#1B1A2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#302F43] disabled:opacity-50">{isPending ? "Saving…" : "Save request update"}</button>
    </form>
  );
}