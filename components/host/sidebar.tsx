"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useEffect } from "react";
import {
  Home,
  Building2,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
  BookOpenText,
  Wallet,
  BadgeDollarSign,
  ArrowLeft,
  LifeBuoy,
  Star,
  MoreHorizontal,
} from "lucide-react";
import { getHostNavigationAttentionCount } from "@/app/lib/host/actions";

let attentionCountRequest: Promise<number> | null = null;

function loadAttentionCount() {
  if (!attentionCountRequest) {
    const request = getHostNavigationAttentionCount();
    attentionCountRequest = request;
    void request.then(
      () => {
        if (attentionCountRequest === request) attentionCountRequest = null;
      },
      () => {
        if (attentionCountRequest === request) attentionCountRequest = null;
      },
    );
  }
  return attentionCountRequest;
}

const NAV = [
  { href: "/host", label: "Dashboard", icon: Home },
  { href: "/host/listings", label: "My Listings", icon: Building2 },
  { href: "/host/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/host/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/host/payouts", label: "Payouts", icon: Wallet },
  { href: "/host/date-changes", label: "Date Changes", icon: ClipboardCheck },
  { href: "/host/refunds", label: "Guest Refunds", icon: BadgeDollarSign },
  { href: "/host/reviews", label: "Reviews", icon: Star },
  { href: "/host/guide", label: "Host Guide", icon: BookOpenText },
  { href: "/account/support", label: "Support", icon: LifeBuoy },
];

const MOBILE_NAV = NAV.slice(0, 5);
const MORE_NAV = [
  ...NAV.slice(5),
  { href: "/", label: "Back to site", icon: ArrowLeft },
];

export default function HostSidebar() {
  const pathname = usePathname();
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const [attentionCount, setAttentionCount] = useState(0);
  const moreOpen = openMenuPath === pathname;

  useEffect(() => {
    let active = true;
    loadAttentionCount()
      .then((count) => {
        if (active) setAttentionCount(count);
      })
      .catch((error: unknown) => {
        console.error("Failed to load host navigation attention count:", error);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/host") {
      return pathname === "/host";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="account-neu-inset hidden h-screen w-64 shrink-0 flex-col overflow-y-auto overscroll-contain px-4 py-6 text-[#1B1A2E] md:flex">
        <span className="mb-8 px-2 text-xl font-bold">
          Host<span className="text-[#E23E85]"> Panel</span>
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
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85] ${
                  active
                    ? "bg-[#FCE8F0] text-[#9C2454] shadow-[inset_2px_2px_5px_rgba(156,36,84,0.08),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
                    : "text-gray-600 hover:bg-white/70 hover:text-[#1B1A2E] hover:shadow-[4px_4px_8px_rgba(27,26,46,0.08),-4px_-4px_8px_rgba(255,255,255,0.9)] active:bg-gray-100 active:shadow-[inset_3px_3px_6px_rgba(27,26,46,0.06),inset_-3px_-3px_6px_rgba(255,255,255,0.9)]"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <Link
            href="/"
            className="account-neu-surface flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-all hover:text-[#1B1A2E] hover:shadow-[4px_4px_8px_rgba(27,26,46,0.08),-4px_-4px_8px_rgba(255,255,255,0.9)] active:shadow-[inset_3px_3px_6px_rgba(27,26,46,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-[#F7F7F9] px-4 py-3 text-[#1B1A2E] shadow-[0_3px_12px_rgba(27,26,46,0.055)] md:hidden">
        <span className="font-bold">
          Host <span className="text-[#E23E85]">Panel</span>
        </span>
        <div className="relative">
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="host-mobile-more-menu"
            onClick={() => setOpenMenuPath(moreOpen ? null : pathname)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-gray-600 transition-all hover:bg-white/70 hover:text-[#1B1A2E] hover:shadow-[3px_3px_7px_rgba(27,26,46,0.07),-3px_-3px_7px_rgba(255,255,255,0.9)] active:shadow-[inset_2px_2px_4px_rgba(27,26,46,0.06)] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40"
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            More
          </button>
          {moreOpen && (
            <nav id="host-mobile-more-menu" aria-label="More host destinations" className="account-neu-surface absolute right-0 top-12 z-40 w-56 rounded-2xl p-2 text-[#1B1A2E]">
              {MORE_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpenMenuPath(null)}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85] ${active ? "bg-[#FCE8F0] text-[#9C2454] shadow-[inset_2px_2px_5px_rgba(156,36,84,0.08),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]" : "text-gray-600 hover:bg-white/70 hover:text-[#1B1A2E] hover:shadow-[3px_3px_7px_rgba(27,26,46,0.07),-3px_-3px_7px_rgba(255,255,255,0.9)] active:shadow-[inset_2px_2px_4px_rgba(27,26,46,0.06)]"}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav aria-label="Primary host navigation" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-[#E9E6DD] bg-white pb-[env(safe-area-inset-bottom)] pt-1 md:hidden">
        {MOBILE_NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.label === "Bookings" && attentionCount > 0 ? `${item.label}, ${attentionCount} items need attention` : item.label}
              title={item.label}
              className={`mx-0.5 my-1 flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E23E85] ${
                active ? "bg-[#FCE8F0] text-[#9C2454] shadow-[inset_2px_2px_5px_rgba(156,36,84,0.08),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]" : "text-gray-600 hover:text-[#1B1A2E] active:shadow-[inset_2px_2px_4px_rgba(27,26,46,0.06)]"
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.label === "Bookings" && attentionCount > 0 && (
                  <span aria-hidden="true" className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#E23E85] px-1 text-[9px] font-bold leading-none text-white">
                    {attentionCount > 99 ? "99+" : attentionCount}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate">{item.label === "My Listings" ? "Listings" : item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

