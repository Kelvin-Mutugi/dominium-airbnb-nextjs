// components/admin/users/user-row-actions.tsx
"use client";

import { useState, useTransition } from "react";
import { suspendUser, reactivateUser, verifyHost } from "@/app/admin/users/actions";

export function UserRowActions({
  userId,
  status,
  role,
  hostVerifiedAt,
}: {
  userId: string;
  status: string;
  role: string;
  hostVerifiedAt: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="flex gap-2 items-center">
      {status === "suspended" ? (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => reactivateUser(userId))}
          className="text-xs px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          Reactivate
        </button>
      ) : (
        <button
          disabled={isPending}
          onClick={() => setShowSuspendModal(true)}
          className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          Suspend
        </button>
      )}

      {role === "host" && !hostVerifiedAt && (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => verifyHost(userId))}
          className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Verify Host
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
                onClick={() => setShowSuspendModal(false)}
                className="text-xs px-3 py-1.5 rounded border"
              >
                Cancel
              </button>
              <button
                disabled={!reason.trim() || isPending}
                onClick={() =>
                  startTransition(async () => {
                    await suspendUser(userId, reason);
                    setShowSuspendModal(false);
                    setReason("");
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
    </div>
  );
}