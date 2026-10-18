"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { reviewHostListingChangeRequest } from "@/app/admin/listing-changes/actions";

export function ListingChangeReviewForm({
  requestId,
  status,
  adminNote,
}: {
  requestId: string;
  status: string;
  adminNote: string | null;
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
        await reviewHostListingChangeRequest(formData);
        router.refresh();
      } catch (reviewError) {
        setError(
          reviewError instanceof Error
            ? reviewError.message
            : "Unable to save the review.",
        );
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 border-t pt-4">
      <input type="hidden" name="request_id" value={requestId} />
      <div>
        <label htmlFor={`change-status-${requestId}`} className="block text-xs font-medium text-gray-600">
          Review status
        </label>
        <select
          id={`change-status-${requestId}`}
          name="status"
          defaultValue={status}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1B1A2E]"
        >
          <option value="pending_review">Pending review</option>
          <option value="reviewed">Reviewed</option>
          <option value="follow_up">Follow up with host</option>
        </select>
      </div>
      <div>
        <label htmlFor={`change-note-${requestId}`} className="block text-xs font-medium text-gray-600">
          Update for host
        </label>
        <textarea
          id={`change-note-${requestId}`}
          name="admin_note"
          maxLength={3000}
          rows={3}
          defaultValue={adminNote ?? ""}
          placeholder="Add a review note or next step for the host"
          className="mt-1 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-[#1B1A2E]"
        />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[#1B1A2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#302F43] disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save review"}
      </button>
    </form>
  );
}
