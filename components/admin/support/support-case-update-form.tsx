"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { updateSupportCase } from "@/app/admin/support/actions";

const CASE_STATUSES = ["new", "in_review", "waiting_on_user", "resolved", "closed"];

export function SupportCaseUpdateForm({
  caseId,
  status,
  publicReply,
  adminNotes,
}: {
  caseId: string;
  status: string;
  publicReply: string | null;
  adminNotes: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextStatus = String(formData.get("status") ?? status);
    if (nextStatus !== status && !window.confirm(`Change support case status from ${status.replaceAll("_", " ")} to ${nextStatus.replaceAll("_", " ")}?`)) return;

    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateSupportCase(formData);
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save support case update.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 border-t pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
      <input type="hidden" name="case_id" value={caseId} />
      <input type="hidden" name="current_status" value={status} />
      <div>
        <label htmlFor={`status-${caseId}`} className="block text-xs font-medium text-gray-600">Case status</label>
        <select id={`status-${caseId}`} name="status" defaultValue={status} className="mt-1 w-full rounded-md border border-[#D9D5CF] bg-[#F7F5F2] px-2.5 py-2 text-sm text-[#1B1A2E] focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20">
          {CASE_STATUSES.map((candidate) => <option key={candidate} value={candidate}>{candidate.replaceAll("_", " ")}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`reply-${caseId}`} className="block text-xs font-medium text-gray-600">Reply to requester</label>
        <textarea id={`reply-${caseId}`} name="public_reply" rows={3} maxLength={5000} defaultValue={publicReply ?? ""} placeholder="Visible in their support history" className="mt-1 w-full resize-y rounded-md border border-[#D9D5CF] bg-[#F7F5F2] px-2.5 py-2 text-sm text-[#1B1A2E] placeholder:text-[#8A8797] focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
      </div>
      <div>
        <label htmlFor={`notes-${caseId}`} className="block text-xs font-medium text-gray-600">Internal notes</label>
        <textarea id={`notes-${caseId}`} name="admin_notes" rows={3} maxLength={5000} defaultValue={adminNotes ?? ""} placeholder="Staff-only notes" className="mt-1 w-full resize-y rounded-md border border-[#D9D5CF] bg-[#F7F5F2] px-2.5 py-2 text-sm text-[#1B1A2E] placeholder:text-[#8A8797] focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {saved && <p role="status" className="text-sm text-emerald-700">Update saved.</p>}
      <button type="submit" disabled={isPending} className="rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-medium text-white hover:bg-[#302F43] disabled:opacity-60">
        {isPending ? "Saving..." : "Save update"}
      </button>
    </form>
  );
}