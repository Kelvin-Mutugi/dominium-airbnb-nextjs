"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reviewHostVerification } from "@/app/admin/verification/actions";

export function HostVerificationActions({ hostId }: { hostId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function review(decision: "approved" | "rejected") {
    if (decision === "approved" && !window.confirm("Approve this host? This confirms the identity documents and enables host access.")) return;
    if (decision === "rejected" && !window.confirm("Reject this host application and request changes?")) return;

    const formData = new FormData();
    formData.set("host_id", hostId);
    formData.set("decision", decision);
    formData.set("reason", reason);
    setError(null);

    startTransition(async () => {
      try {
        await reviewHostVerification(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save verification decision.");
      }
    });
  }

  return (
    <div className="space-y-4 border-t pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
      <button type="button" disabled={isPending} onClick={() => review("approved")} className="w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{isPending ? "Saving..." : "Approve host"}</button>
      <div className="space-y-2">
        <label htmlFor={`reason-${hostId}`} className="block text-sm font-medium text-[#1B1A2E]">Reason for rejection</label>
        <textarea id={`reason-${hostId}`} value={reason} onChange={(event) => setReason(event.target.value)} required minLength={10} maxLength={1000} rows={4} placeholder="Explain what needs correction so the host can resubmit." className="w-full rounded-md border border-[#D9D5CF] bg-[#F7F5F2] px-3 py-2 text-sm text-[#1B1A2E] placeholder:text-gray-400 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
        <button type="button" disabled={isPending || reason.trim().length < 10} onClick={() => review("rejected")} className="w-full rounded-md border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">{isPending ? "Saving..." : "Reject and request changes"}</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}