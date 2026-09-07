// components/host/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlusCircle } from "lucide-react";

const NAV_ITEMS = [
  { href: "/host", label: "My Listings", icon: LayoutDashboard, exact: true },
  { href: "/host/listings/new", label: "Add Listing", icon: PlusCircle },
];

export function HostSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-white border-r min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <span className="text-lg font-semibold text-[#1f2937]">Host <span className="text-[#E23E85]">Portal</span></span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100"
        >
          ← Back to site
        </Link>
      </div>
    </aside>
  );
}