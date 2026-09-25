// components/admin/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Home,
  CalendarCheck,
  Wallet,
  LifeBuoy,
  BadgeCheck,
  Star,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/verification", label: "Host Verification", icon: BadgeCheck },
  { href: "/admin/listings", label: "Listings", icon: Home },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/payouts", label: "Payments & Payouts", icon: Wallet },
  { href: "/admin/support", label: "Support & Disputes", icon: LifeBuoy },
  { href: "/admin/reviews", label: "Reviews Moderation", icon: Star },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r bg-white">
      <div className="p-6 border-b">
        <span className="text-lg font-semibold text-[#1B1A2E]">Dominium <span className="text-[#E23E85]">Admin</span> </span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
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