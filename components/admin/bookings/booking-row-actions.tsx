// components/admin/bookings/booking-row-actions.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmBooking, cancelBooking } from "@/app/admin/bookings/actions";

export function BookingRowActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const runAction = (label: string, action: () => Promise<void>) => {
    if (!window.confirm(`${label} this booking?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : `Unable to ${label.toLowerCase()} booking.`);
      }
    });
  };

  const btn = (label: string, action: () => Promise<void>, color: string) => (
    <button
      type="button"
      disabled={isPending}
      onClick={() => runAction(label, action)}
      className={`text-xs px-3 py-1.5 rounded text-white disabled:opacity-50 ${color}`}
    >
      {isPending ? "Working..." : label}
    </button>
  );

  if (status === "completed") {
    return <span className="text-xs text-gray-400">Stay completed</span>;
  }
  if (status === "cancelled") {
    return <span className="text-xs text-gray-400">Cancelled</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex gap-2">
      {status === "pending" &&
        btn(
          "Confirm",
          () => confirmBooking(bookingId),
          "bg-green-600 hover:bg-green-700"
        )}
      {btn(
        "Cancel",
        () => cancelBooking(bookingId),
        "bg-red-600 hover:bg-red-700"
      )}
      </div>
      {error && <p role="alert" className="max-w-48 text-xs text-red-600">{error}</p>}
    </div>
  );
}