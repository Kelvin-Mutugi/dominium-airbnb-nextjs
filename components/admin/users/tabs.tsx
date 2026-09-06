// components/admin/users/tabs.tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function UserTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") === "hosts" ? "hosts" : "guests";

  const tabClass = (tab: string) =>
    `px-4 py-2 text-sm font-medium border-b-2 ${
      active === tab
        ? "border-gray-900 text-gray-900"
        : "border-transparent text-gray-500 hover:text-gray-700"
    }`;

  return (
    <div className="flex border-b mb-4">
      <Link href={`${pathname}?tab=guests`} className={tabClass("guests")}>
        Guests
      </Link>
      <Link href={`${pathname}?tab=hosts`} className={tabClass("hosts")}>
        Hosts
      </Link>
    </div>
  );
}