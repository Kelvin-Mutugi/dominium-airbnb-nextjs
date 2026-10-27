// components/admin/listings/tabs.tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const STATUSES = [
  { value: "all", label: "All listings" },
  { value: "pending_review", label: "Pending Review" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Live" },
  { value: "archived", label: "Archived" },
  { value: "suspended", label: "Suspended" },
];

export function ListingTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("status") ?? "pending_review";

  return (
    <div className="-mx-1 mb-4 overflow-x-auto">
      <div className="flex min-w-max border-b">
      {STATUSES.map((s) => (
        <Link
          key={s.value}
          href={`${pathname}?${new URLSearchParams({
            status: s.value,
            ...(searchParams.get("q") ? { q: searchParams.get("q") ?? "" } : {}),
          }).toString()}`}
          className={`min-h-11 whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 sm:px-4 ${
            active === s.value
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {s.label}
        </Link>
      ))}
      </div>
    </div>
  );
}