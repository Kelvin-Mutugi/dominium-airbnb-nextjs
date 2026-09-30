// components/admin/users/user-row-actions.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suspendUser, reactivateUser } from "@/app/admin/users/actions";

export function UserRowActions({
  userId,
  status,
}: {
  userId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reactivate() {
    if (!window.confirm("Reactivate this user account?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await reactivateUser(userId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to reactivate account.");
      }
    });
  }

  return (
    <div className="flex gap-2 items-center">
      {status === "suspended" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={reactivate}
          className="text-xs px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          Reactivate
        </button>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => { setError(null); setShowSuspendModal(true); }}
          className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          Suspend
        </button>
      )}

      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold">Suspend user</h3>
            <textarea
              className="w-full border rounded p-2 text-sm"
              rows={3}
              placeholder="Reason for suspension"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSuspendModal(false)}
                className="text-xs px-3 py-1.5 rounded border"
              >
                Cancel
              </button>
              <button
                disabled={!reason.trim() || isPending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      setError(null);
                      await suspendUser(userId, reason);
                      setShowSuspendModal(false);
                      setReason("");
                      router.refresh();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Unable to suspend account.");
                    }
                  })
                }
                className="text-xs px-3 py-1.5 rounded bg-red-600 text-white disabled:opacity-50"
              >
                Confirm Suspend
              </button>
            </div>
          </div>
        </div>
      )}
      {error && !showSuspendModal && <p role="alert" className="max-w-52 text-xs text-red-600">{error}</p>}
    </div>
  );
}