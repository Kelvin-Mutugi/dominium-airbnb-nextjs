"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moderateReview } from "@/app/admin/reviews/actions";

export function ReviewModerationActions({
  reviewId,
  reviewType,
  status,
}: {
  reviewId: string;
  reviewType: "host" | "listing";
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function moderate(nextStatus: "published" | "hidden") {
    const actionName = nextStatus === "hidden" ? "hide" : "publish";
    if (!window.confirm(`${actionName === "hide" ? "Hide" : "Publish"} this ${reviewType} review?`)) return;
    const formData = new FormData();
    formData.set("review_id", reviewId);
    formData.set("review_type", reviewType);
    formData.set("moderation_status", nextStatus);
    setError(null);

    startTransition(async () => {
      try {
        await moderateReview(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update review moderation.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-start gap-2 xl:flex-col">
      {status !== "published" && <button type="button" disabled={isPending} onClick={() => moderate("published")} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60">{isPending ? "Saving..." : "Publish review"}</button>}
      {status !== "hidden" && <button type="button" disabled={isPending} onClick={() => moderate("hidden")} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">{isPending ? "Saving..." : "Hide review"}</button>}
      {error && <p role="alert" className="max-w-56 text-xs text-red-600">{error}</p>}
    </div>
  );
}