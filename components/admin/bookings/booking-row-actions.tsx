// components/admin/bookings/booking-row-actions.tsx
"use client";

import { useTransition } from "react";
import { confirmBooking, cancelBooking } from "@/app/admin/bookings/actions";

export function BookingRowActions({
  bookingId,
  status,
}: {
  bookingId: string;
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

  if (status === "completed") {
    return <span className="text-xs text-gray-400">Stay completed</span>;
  }
  if (status === "cancelled") {
    return <span className="text-xs text-gray-400">Cancelled</span>;
  }

  return (
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
  );
}