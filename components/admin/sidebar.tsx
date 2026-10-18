// components/admin/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Home,
  CalendarCheck,
  Wallet,
  LifeBuoy,
  BadgeCheck,
  Star,
  History,
  ClipboardList,
  ClipboardCheck,
  MessageSquareText,
  Mail,
  BadgeDollarSign,
  CreditCard,
  Banknote,
  BookOpen,
  ArrowLeftRight,
  ChartNoAxesCombined,
  CircleHelp,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

type AdminNavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  ledgerView?: "payments" | "payouts";
};

const NAV_GROUPS: {
  heading: string;
  explanation: string;
  links: AdminNavLink[];
}[] = [
  {
    heading: "Overview",
    explanation:
      "Start at the dashboard for a summary of the platform and work that may need attention.",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    heading: "Marketplace",
    explanation:
      "Manage property listings, review host-submitted live changes, and follow property visit requests.",
    links: [
      { href: "/admin/listings", label: "Listings", icon: Home },
      {
        href: "/admin/listing-changes",
        label: "Listing Changes",
        icon: ClipboardCheck,
      },
      {
        href: "/admin/listing-requests",
        label: "Property Visit Requests",
        icon: ClipboardList,
      },
    ],
  },
  {
    heading: "Bookings",
    explanation:
      "Find reservations and review cancellation requests. Booking details show the guest, host, dates, and current status.",
    links: [
      { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
      {
        href: "/admin/cancellation-requests",
        label: "Cancellation Requests",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    heading: "People & Trust",
    explanation:
      "Look up user accounts and review host verification submissions.",
    links: [
      { href: "/admin/users", label: "Users", icon: Users },
      {
        href: "/admin/verification",
        label: "Host Verification",
        icon: BadgeCheck,
      },
    ],
  },
  {
    heading: "Finance & Ledger",
    explanation:
      "Review the accounting records created by financial activity. The ledger, reports, and reconciliation are read-only; they do not approve refunds or send payments.",
    links: [
      {
        href: "/admin/financial",
        label: "Finance Overview",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        href: "/admin/financial/ledger",
        label: "Journal Entries",
        icon: BookOpen,
      },
      {
        href: "/admin/financial/payouts",
        label: "Host Settlement Journal",
        icon: Wallet,
      },
      {
        href: "/admin/financial/refunds",
        label: "Refund & Reversal Journal",
        icon: BadgeDollarSign,
      },
      {
        href: "/admin/financial/reconciliation",
        label: "Ledger Reconciliation",
        icon: ArrowLeftRight,
      },
      {
        href: "/admin/financial/reports",
        label: "Ledger Reports",
        icon: ChartNoAxesCombined,
      },
      {
        href: "/admin/financial/documentation",
        label: "Finance Documentation",
        icon: CircleHelp,
      },
    ],
  },
  {
    heading: "Payments & Payouts",
    explanation:
      "Use these pages to review guest payment records and process host withdrawal requests. A request or pending transfer is not proof that money moved.",
    links: [
      {
        href: "/admin/payouts?view=payments",
        label: "Guest Payments",
        icon: CreditCard,
        ledgerView: "payments",
      },
      {
        href: "/admin/payouts?view=payouts",
        label: "Host Payouts",
        icon: Wallet,
        ledgerView: "payouts",
      },
      {
        href: "/admin/payouts/requests",
        label: "Host Payout Requests",
        icon: Banknote,
      },
      {
        href: "/admin/refunds",
        label: "Refund Requests",
        icon: BadgeDollarSign,
      },
    ],
  },
  {
    heading: "Support & Quality",
    explanation:
      "Use support cases and booking messages to help guests and hosts. Contact Messages are general enquiries; Reviews Moderation is for public feedback.",
    links: [
      {
        href: "/admin/support",
        label: "Support Cases & Disputes",
        icon: LifeBuoy,
      },
      {
        href: "/admin/customer-support",
        label: "Booking Messages",
        icon: MessageSquareText,
      },
      { href: "/admin/contact-messages", label: "Contact Messages", icon: Mail },
      { href: "/admin/reviews", label: "Reviews Moderation", icon: Star },
    ],
  },
  {
    heading: "System",
    explanation:
      "Use the Audit Log to review administrative actions and when they happened.",
    links: [{ href: "/admin/audit-log", label: "Audit Log", icon: History }],
  },
];

function isLinkActive(
  link: AdminNavLink,
  pathname: string,
  view: string | null,
) {
  if (link.ledgerView) {
    return (
      pathname === "/admin/payouts" &&
      (view ?? "payments") === link.ledgerView
    );
  }

  return link.exact
    ? pathname === link.href
    : pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  return (
    <aside
      className={`flex h-full shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div
        className={`flex min-h-[73px] items-center border-b border-gray-200 bg-white ${
          isCollapsed ? "justify-center px-2" : "justify-between px-5"
        }`}
      >
        {!isCollapsed && (
          <span className="whitespace-nowrap text-lg font-semibold text-[#1B1A2E]">
            Dominium <span className="text-[#E23E85]">Admin</span>
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed((collapsed) => !collapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
        >
          {isCollapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )}
        </button>
      </div>

      <nav
        aria-label="Admin navigation"
        className={`flex-1 space-y-1 overflow-x-hidden overflow-y-auto bg-gray-50 ${
          isCollapsed ? "p-2" : "p-3"
        }`}
      >
        {NAV_GROUPS.map((group) => {
          const groupIsActive = group.links.some((link) =>
            isLinkActive(link, pathname, searchParams.get("view")),
          );
          const GroupIcon = group.links[0].icon;
          const groupIsOpen =
            expandedGroup === null
              ? groupIsActive
              : expandedGroup === group.heading;
          const groupContentId = `admin-nav-${group.heading
            .toLowerCase()
            .replaceAll(" & ", "-")
            .replaceAll(" ", "-")}`;

          return (
            <section
              key={group.heading}
              className={`group rounded-lg border ${
                groupIsActive
                  ? "border-gray-200 bg-white shadow-sm"
                  : "border-transparent bg-transparent"
              }`}
            >
              <div
                className={`flex min-h-10 items-center ${
                  isCollapsed ? "justify-center" : "gap-1 px-2"
                }`}
              >
                <button
                  type="button"
                  title={isCollapsed ? group.heading : undefined}
                  aria-label={group.heading}
                  aria-expanded={!isCollapsed && groupIsOpen}
                  aria-controls={groupContentId}
                  onClick={() => {
                    if (isCollapsed) {
                      setIsCollapsed(false);
                      setExpandedGroup(group.heading);
                    } else {
                      setExpandedGroup(groupIsOpen ? "" : group.heading);
                    }
                  }}
                  className={`flex min-h-10 cursor-pointer list-none items-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 [&::-webkit-details-marker]:hidden ${
                    isCollapsed
                      ? "justify-center px-0"
                      : "flex-1 justify-between gap-2 px-1"
                  } ${
                    groupIsActive
                      ? "text-gray-900"
                      : "text-gray-600 hover:bg-white hover:text-gray-900"
                  }`}
                >
                  {!isCollapsed && <span>{group.heading}</span>}
                  {isCollapsed ? (
                    <span className="flex size-8 items-center justify-center rounded-md text-gray-500">
                      <GroupIcon size={17} aria-hidden="true" />
                    </span>
                  ) : (
                    <ChevronDown
                      aria-hidden="true"
                      size={16}
                      className={`shrink-0 text-gray-400 transition-transform ${
                        groupIsOpen ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>
                {!isCollapsed && (
                  <div className="group/help relative flex shrink-0 items-center">
                    <button
                      type="button"
                      aria-label={`Help for ${group.heading}`}
                      aria-describedby={`${groupContentId}-help`}
                      className="flex size-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gray-500"
                    >
                      <CircleHelp size={15} aria-hidden="true" />
                    </button>
                    <div
                      id={`${groupContentId}-help`}
                      role="tooltip"
                      className="invisible absolute right-0 top-full z-50 mt-1 w-60 rounded-lg border border-gray-200 bg-white p-3 text-left text-xs font-normal leading-5 text-gray-600 opacity-0 shadow-lg transition-opacity group-hover/help:visible group-hover/help:opacity-100 group-focus-within/help:visible group-focus-within/help:opacity-100"
                    >
                      <p>{group.explanation}</p>
                      {(group.heading === "Finance & Ledger" ||
                        group.heading === "Payments & Payouts") && (
                        <Link
                          href="/admin/financial/documentation"
                          className="mt-2 inline-flex font-semibold text-gray-800 underline decoration-gray-300 underline-offset-2 hover:text-black"
                        >
                          Open finance documentation
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {!isCollapsed && groupIsOpen && (
                <div id={groupContentId} className="space-y-1 px-2 pb-2">
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    const isActive = isLinkActive(
                      link,
                      pathname,
                      searchParams.get("view"),
                    );

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setExpandedGroup(group.heading)}
                        className={`flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-gray-100 font-semibold text-gray-950 ring-1 ring-inset ring-gray-200"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
                        }`}
                      >
                        <Icon size={17} className="shrink-0 text-gray-500" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </nav>

      <div
        className={`border-t border-gray-200 bg-white ${
          isCollapsed ? "p-2" : "p-3"
        }`}
      >
        <Link
          href="/"
          title={isCollapsed ? "Back to site" : undefined}
          aria-label={isCollapsed ? "Back to site" : undefined}
          className={`flex min-h-10 items-center rounded-md py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 ${
            isCollapsed ? "justify-center px-0" : "gap-3 px-3"
          }`}
        >
          {!isCollapsed && "← Back to site"}
          {isCollapsed && <span aria-hidden="true">←</span>}
        </Link>
      </div>
    </aside>
  );
}
