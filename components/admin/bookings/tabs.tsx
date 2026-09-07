// components/admin/bookings/tabs.tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function BookingTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("status") ?? "pending";

  return (
    <div className="flex border-b mb-4">
      {STATUSES.map((s) => (
        <Link
          key={s.value}
          href={`${pathname}?status=${s.value}`}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            active === s.value
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}