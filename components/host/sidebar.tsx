"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  CalendarDays,
  Wallet,
  Plus,
  ArrowLeft,
} from "lucide-react";

const NAV = [
  { href: "/host", label: "Dashboard", icon: Home },
  { href: "/host/listings", label: "Listings", icon: Building2 },
  { href: "/host/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/host/payouts", label: "Payouts", icon: Wallet },
];

export default function HostSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/host") {
      return pathname === "/host";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col overflow-y-auto overscroll-contain bg-[#040720] px-4 py-6 text-white md:flex">
        <span className="mb-8 px-2 text-xl font-bold">
          Host<span className="text-[#ec1561]"> Panel</span>
        </span>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#ec1561] text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
          <Link
            href="/host/listings/new"
            className="flex items-center justify-center gap-2 rounded-lg bg-[#f2a71b] px-3 py-2.5 text-sm font-semibold text-[#12231d] transition hover:bg-[#ffc34d]"
          >
            <Plus className="h-4 w-4" />
            New listing
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-[#12231d] px-4 py-3 text-white md:hidden">
        <span className="font-bold">
          Host <span className="text-[#ec1561]">Panel</span>
        </span>

        <Link
          href="/host/listings/new"
          className="flex items-center gap-1.5 rounded-md bg-[#f2a71b] px-3 py-1.5 text-xs font-semibold text-[#12231d]"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </Link>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t bg-white py-2 md:hidden">
        {NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 text-xs ${
                active ? "text-[#ec1561]" : "text-gray-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

