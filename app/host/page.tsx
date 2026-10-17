// app/host/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  MessageCircle,
  Pencil,
  MapPin,
  Phone,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getHostOverviewData } from "@/app/lib/host/actions";
import type { HostArrivalGuideDetails, HostBookingChangeRequest, Booking } from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";
import ArrivalGuideQuickEdit from "@/components/host/ArrivalGuideQuickEdit";

let hostOverviewRequest: ReturnType<typeof getHostOverviewData> | null = null;

function loadHostOverviewData() {
  if (!hostOverviewRequest) {
    const request = getHostOverviewData();
    hostOverviewRequest = request;
    void request.then(
      () => {
        if (hostOverviewRequest === request) hostOverviewRequest = null;
      },
      () => {
        if (hostOverviewRequest === request) hostOverviewRequest = null;
      },
    );
  }
  return hostOverviewRequest;
}

/* ------------------------------------------------------------------ */
/* Shared styling                                                      */
/* ------------------------------------------------------------------ */

const card = "rounded-2xl border border-[#E9E6DD] bg-white";
const cardHeader = "flex items-center justify-between gap-3 px-5 pt-5";
const linkAccent = "text-sm font-semibold text-[#9C2454] hover:underline underline-offset-4";

const tones = {
  amber: { icon: "bg-[#fff0d8] text-[#9a5b00]", pill: "bg-[#fff0d8] text-[#9a5b00]" },
  blue: { icon: "bg-[#eaf0f7] text-[#365d80]", pill: "bg-[#eaf0f7] text-[#365d80]" },
} as const;

type AttentionItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  tone: keyof typeof tones;
  title: string;
  subtitle: string;
  tag: string;
};

/** Segmented progress bar, same idea as the occupancy bars in the reference. */
function SegmentedBar({ percent, segments = 10 }: { percent: number; segments?: number }) {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * segments);
  return (
    <div className="flex gap-[3px]" aria-hidden="true">
      {Array.from({ length: segments }).map((_, index) => (
        <span
          key={index}
          className={`h-4 flex-1 rounded-full ${index < filled ? "bg-[#12231d]" : "bg-[#12231d]/10"}`}
        />
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-6" aria-busy="true" aria-label="Loading your dashboard">
      <div className="h-24 rounded-2xl bg-[#12231d]/5" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-36 rounded-2xl bg-[#12231d]/5" />
            ))}
          </div>
          <div className="h-80 rounded-2xl bg-[#12231d]/5" />
        </div>
        <div className="h-96 rounded-2xl bg-[#12231d]/5" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function HostDashboardPage() {
  const [hasActiveOrDraftListings, setHasActiveOrDraftListings] = useState<boolean | null>(null);
  const [hostName, setHostName] = useState("there");
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Awaited<ReturnType<typeof getHostOverviewData>>["listings"]>([]);
  const [calendarPreview, setCalendarPreview] = useState<Awaited<ReturnType<typeof getHostOverviewData>>["calendarPreview"]>([]);
  const [calendarDates, setCalendarDates] = useState<string[]>([]);
  const [payoutPhone, setPayoutPhone] = useState("");
  const [availablePayout, setAvailablePayout] = useState(0);
  const [pendingPayout, setPendingPayout] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [monthlyBookingCount, setMonthlyBookingCount] = useState(0);
  const [supportReplyBookings, setSupportReplyBookings] = useState<Booking[] | null>(null);
  const [changeRequests, setChangeRequests] = useState<HostBookingChangeRequest[] | null>(null);
  const [arrivalGuides, setArrivalGuides] = useState<Record<string, HostArrivalGuideDetails | null> | null>(null);
  const [arrivalGuideError, setArrivalGuideError] = useState(false);
  const [editingArrivalBookingId, setEditingArrivalBookingId] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<{
    kyc_status?: string | null;
    kyc_rejection_reason?: string | null;
    host_verified_at?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setError(null);
        const data = await loadHostOverviewData();
        if (!active) return;
        setHasActiveOrDraftListings(data.hasActiveOrDraftListings);
        setHostName(data.hostName);
        setUpcoming(data.upcoming);
        setPendingBookings(data.pendingBookings);
        setListings(data.listings);
        setCalendarPreview(data.calendarPreview);
        setCalendarDates(data.calendarDates);
        setPayoutPhone(data.payoutPhone);
        setAvailablePayout(data.availablePayout);
        setPendingPayout(data.pendingPayout);
        setMonthlyEarnings(data.monthlyEarnings);
        setOccupancyRate(data.occupancyRate);
        setMonthlyBookingCount(data.monthlyBookingCount);
        setOnboardingStatus(data.onboardingStatus);
        setSupportReplyBookings(data.supportReplyBookings);
        setChangeRequests(data.changeRequests);
        setArrivalGuides(data.arrivalGuides);
        setArrivalGuideError(data.arrivalGuides === null);
      } catch (loadError) {
        console.error("Failed to load host dashboard:", loadError);
        if (active) setError("We couldn't load your dashboard. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [reloadToken]);

  function retryLoading() {
    setLoading(true);
    setReloadToken((token) => token + 1);
  }

  function getCheckInUrgency(checkIn: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(`${checkIn}T00:00:00`);
    const daysUntil = Math.round((checkInDate.getTime() - today.getTime()) / 86_400_000);
    if (daysUntil <= 0) return "Today";
    if (daysUntil === 1) return "Tomorrow";
    if (daysUntil <= 3) return `In ${daysUntil} days`;
    return null;
  }

  function formatStayDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
    });
  }

  function toWhatsAppNumber(phone: string) {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("254")) return digits;
    if (digits.startsWith("0")) return `254${digits.slice(1)}`;
    return digits;
  }

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div role="alert" className="max-w-xl rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        <p>{error}</p>
        <button onClick={retryLoading} className="mt-3 font-semibold underline underline-offset-2">
          Try again
        </button>
      </div>
    );
  }

  /* ---------------------------- derived data ---------------------------- */

  const isVerified = Boolean(onboardingStatus?.host_verified_at) || onboardingStatus?.kyc_status === "approved";
  const unreadBookings = (supportReplyBookings ?? []).filter((booking) => (booking.unreadSupportReplyCount ?? 0) > 0);
  const pendingChanges = changeRequests ?? [];
  const verificationNeedsAction = Boolean(onboardingStatus && !isVerified && onboardingStatus.kyc_status !== "pending");
  const verificationLabel = isVerified
    ? "Verified"
    : onboardingStatus?.kyc_status === "pending"
      ? "In review"
      : "Verification needed";
  const imminentCheckins = upcoming.filter((booking) =>
    ["Today", "Tomorrow"].includes(getCheckInUrgency(booking.check_in) ?? ""),
  );
  const missingPayoutPhone = !payoutPhone;
  const attentionDataUnavailable = supportReplyBookings === null || changeRequests === null;
  const hasPublishedListing = listings.some((listing) => listing.status === "published");

  const digitsOnlyPhone = payoutPhone.replace(/\D/g, "");
  const localPayoutPhone = digitsOnlyPhone.startsWith("254") ? `0${digitsOnlyPhone.slice(3)}` : digitsOnlyPhone;
  const maskedPayoutPhone =
    localPayoutPhone.length === 10
      ? `${localPayoutPhone.slice(0, 2)}XX XXX ${localPayoutPhone.slice(-3)}`
      : digitsOnlyPhone
        ? `•••• ${digitsOnlyPhone.slice(-3)}`
        : "Add an M-Pesa number";
  const money = (amount: number) => `KES ${amount.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

  const ratedListings = listings.filter((listing) => Number(listing.review_count ?? 0) > 0);
  const averageRating = ratedListings.length
    ? (ratedListings.reduce((total, listing) => total + Number(listing.average_rating ?? 0), 0) / ratedListings.length).toFixed(1)
    : "—";

  const attentionItems: AttentionItem[] = [];
  if (missingPayoutPhone) {
    attentionItems.push({
      key: "payout-phone",
      href: "/host/payouts",
      icon: Wallet,
      tone: "amber",
      title: "Add your M-Pesa payout number",
      subtitle: "So your earnings can reach your phone.",
      tag: "Set up",
    });
  }
  pendingBookings.forEach((booking) =>
    attentionItems.push({
      key: `pending-${booking.id}`,
      href: "/host/calendar",
      icon: CalendarDays,
      tone: "amber",
      title: `Confirm booking for ${booking.guest_name ?? "guest"}`,
      subtitle: `${booking.listing?.title ?? "Listing"}, from ${formatStayDate(booking.check_in)}`,
      tag: "Review",
    }),
  );
  imminentCheckins.forEach((booking) => {
    const urgency = getCheckInUrgency(booking.check_in) ?? "Soon";
    attentionItems.push({
      key: `arrival-${booking.id}`,
      href: `/host/bookings/${encodeURIComponent(booking.id)}`,
      icon: CalendarDays,
      tone: "blue",
      title: `${booking.guest_name ?? "Guest"} arrives ${urgency.toLowerCase()}`,
      subtitle: `${booking.listing?.title ?? "Listing"}, ${booking.nights} ${booking.nights === 1 ? "night" : "nights"}`,
      tag: urgency,
    });
  });
  if (verificationNeedsAction && onboardingStatus) {
    attentionItems.push({
      key: "verification",
      href: "/host/onboarding",
      icon: AlertTriangle,
      tone: "amber",
      title: onboardingStatus.kyc_status === "rejected" ? "Update your host verification" : "Complete host verification",
      subtitle: onboardingStatus.kyc_rejection_reason ?? "Finish verification to keep bookings and payouts moving.",
      tag: "Verify",
    });
  }
  pendingChanges.forEach((request) =>
    attentionItems.push({
      key: `change-${request.id}`,
      href: `/host/bookings?booking=${encodeURIComponent(request.booking_id)}`,
      icon: CalendarDays,
      tone: "amber",
      title: "Guest asked to change dates",
      subtitle: `${request.booking.guest_name ?? "Guest"}, ${request.booking.listing?.title ?? "Booking"}`,
      tag: "Review",
    }),
  );
  unreadBookings.forEach((booking) =>
    attentionItems.push({
      key: `message-${booking.id}`,
      href: `/host/bookings/${encodeURIComponent(booking.id)}`,
      icon: MessageCircle,
      tone: "blue",
      title: `Support replied about ${booking.listing?.title ?? "a booking"}`,
      subtitle: `Booking ${booking.booking_reference}, ${booking.unreadSupportReplyCount} unread ${booking.unreadSupportReplyCount === 1 ? "reply" : "replies"}`,
      tag: "Reply",
    }),
  );
  const attentionCount = attentionItems.length;
  const visibleAttention = attentionItems.slice(0, 6);

  /* ------------------------------ render ------------------------------ */

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-[#747873]">Host portal / Overview</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[#12231d]">Habari, {hostName} 👋</h1>
            <span
              className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold ${
                isVerified ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {verificationLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#656a65]">
            Here is today&apos;s snapshot of your arrivals, earnings and calendar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 hidden rounded-lg border border-[#E9E6DD] bg-white px-3 py-2.5 text-sm text-[#12231d] md:inline-flex md:items-center md:gap-2">
            <CalendarDays className="h-4 w-4 text-[#747873]" aria-hidden="true" />
            {new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date())}
          </span>
          <Link
            href="/host/calendar"
            className="inline-flex items-center gap-2 rounded-lg border border-[#12231d]/20 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#12231d] transition hover:bg-[#f9f6f1]"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Calendar
          </Link>
          <Link
            href="/host/bookings"
            className="inline-flex items-center gap-2 rounded-lg bg-[#12231d] px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#243c34]"
          >
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Bookings
          </Link>
        </div>
      </header>

      {onboardingStatus && !isVerified && onboardingStatus.kyc_status === "pending" && (
        <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[#12231d]">Host verification is under review</h2>
            <p className="mt-1 text-sm text-gray-600">You can keep managing your listings while we review your application.</p>
          </div>
          <Link href="/host/pending-review" className="shrink-0 text-sm font-semibold text-[#12231d] underline underline-offset-4">
            View application
          </Link>
        </section>
      )}

      {/* Two-column body: main content + side rail */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* ---------- Side rail, top: needs attention ---------- */}
        <section
          aria-label="Needs your attention"
          className={`${card} lg:col-start-2 lg:row-start-1`}
        >
          <div className={cardHeader}>
            <div>
              <h2 className="text-lg font-semibold text-[#12231d]">Needs your attention</h2>
              <p className="mt-0.5 text-sm text-[#747873]">Things waiting on you</p>
            </div>
            {attentionCount > 0 && (
              <span className="grid h-7 min-w-7 place-items-center rounded-full bg-[#FCE8F0] px-2 text-xs font-bold tabular-nums text-[#9C2454]">
                {attentionCount}
              </span>
            )}
          </div>

          <div className="space-y-2.5 p-5">
            {visibleAttention.length === 0 && !attentionDataUnavailable && (
              <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-[#12231d]">You&apos;re all caught up</p>
                  <p className="mt-0.5 text-sm text-[#565c57]">New bookings, messages and requests will show up here.</p>
                </div>
              </div>
            )}

            {visibleAttention.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-[#E9E6DD] p-3.5 transition hover:border-[#12231d]/25 hover:bg-[#fbf9f5] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40"
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tones[item.tone].icon}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#12231d]">{item.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-[#747873]">{item.subtitle}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${tones[item.tone].pill}`}>
                    {item.tag}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#8a8f89] transition group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              );
            })}

            {attentionDataUnavailable && (
              <p className="rounded-xl bg-[#faf8f4] px-3.5 py-3 text-sm text-[#747873]">
                Some requests or messages could not be checked.{" "}
                <Link href="/host/bookings" className="font-semibold text-[#9C2454] hover:underline">
                  Open bookings
                </Link>
              </p>
            )}

            {attentionCount > visibleAttention.length && (
              <Link href="/host/bookings" className={`${linkAccent} inline-flex pt-1`}>
                View all {attentionCount} items
              </Link>
            )}
          </div>
        </section>

        {/* ---------- Main column: money + calendar ---------- */}
        <div className="space-y-6 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <section aria-label="Earnings snapshot" className="grid gap-4 sm:grid-cols-3">
            <div className={`${card} flex flex-col p-5`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-[#656a65]">Available for payout</p>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">M-Pesa</span>
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[#12231d]">{money(availablePayout)}</p>
              <p className="mt-1 text-xs text-[#747873]">
                {availablePayout > 0 ? "Ready to send to" : "Payouts go to"} {maskedPayoutPhone}
              </p>
              <Link href="/host/payouts" className={`${linkAccent} mt-auto inline-flex items-center gap-1 pt-4`}>
                View earnings <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className={`${card} flex flex-col p-5`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-[#656a65]">Earned this month</p>
                <span className="rounded-full bg-[#eaf0f7] px-2 py-0.5 text-xs font-semibold text-[#365d80]">Net</span>
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[#12231d]">{money(monthlyEarnings)}</p>
              <p className="mt-1 text-xs text-[#747873]">Paid out or ready for payout from stays checking out this month</p>
            </div>

            <div className={`${card} flex flex-col p-5`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-[#656a65]">Pending</p>
                <span className="rounded-full bg-[#fff0d8] px-2 py-0.5 text-xs font-semibold text-[#9a5b00]">Held</span>
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[#12231d]">{money(pendingPayout)}</p>
              <p className="mt-1 text-xs text-[#747873]">
                {pendingPayout > 0
                  ? "Released after eligible stays check out"
                  : "Your first payout is released after a guest checks out"}
              </p>
            </div>
          </section>

          <section className={card}>
            <div className={cardHeader}>
              <div>
                <h2 className="text-lg font-semibold text-[#12231d]">Calendar preview</h2>
                <p className="mt-0.5 text-sm text-[#747873]">The next two weeks across your listings</p>
              </div>
              <Link href="/host/calendar" className={linkAccent}>
                Manage calendar
              </Link>
            </div>

            {/* Performance tiles */}
            <div className="grid grid-cols-3 gap-3 px-5 pt-4">
              <div className="rounded-xl bg-[#faf8f4] p-3.5">
                <p className="text-xs text-[#656a65]">Occupancy</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#12231d]">{occupancyRate}%</p>
                <div className="mt-2">
                  <SegmentedBar percent={occupancyRate} />
                </div>
              </div>
              <div className="rounded-xl bg-[#faf8f4] p-3.5">
                <p className="text-xs text-[#656a65]">Bookings this month</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#12231d]">{monthlyBookingCount}</p>
              </div>
              <div className="rounded-xl bg-[#faf8f4] p-3.5">
                <p className="text-xs text-[#656a65]">Average rating</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-lg font-semibold tabular-nums text-[#12231d]">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden="true" />
                  {averageRating}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 px-5 pt-5 text-xs text-[#656a65]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#315b47]" />
                Booked
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-gray-300" />
                Blocked
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-emerald-200 bg-emerald-50" />
                Available, tap to block
              </span>
            </div>

            {calendarPreview.length === 0 ? (
              <p className="px-5 pb-6 pt-4 text-sm text-[#747873]">Your calendar will appear when a listing is ready.</p>
            ) : (
              <div className="overflow-x-auto pb-5 pt-3">
                <div className="min-w-[660px] px-5">
                  <div className="grid grid-cols-[minmax(150px,1.2fr)_repeat(14,minmax(0,1fr))] gap-1 pb-2 text-center text-[10px] leading-tight text-[#747873]">
                    <span className="text-left">Listing</span>
                    {calendarDates.map((date) => {
                      const dateObject = new Date(`${date}T12:00:00Z`);
                      return (
                        <span key={date} className="flex flex-col items-center">
                          <span>{dateObject.toLocaleDateString("en-KE", { weekday: "short" })}</span>
                          <span className="font-semibold text-[#12231d]">{dateObject.getUTCDate()}</span>
                        </span>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    {calendarPreview.map((preview) => {
                      const listing = listings.find((item) => item.id === preview.id);
                      const bookedDays = preview.days.filter((status) => status === "booked").length;
                      return (
                        <div
                          key={preview.id}
                          className="grid grid-cols-[minmax(150px,1.2fr)_repeat(14,minmax(0,1fr))] items-center gap-1"
                        >
                          <span className="min-w-0 pr-2" title={listing?.title ?? "Listing"}>
                            <span className="block truncate text-xs font-semibold text-[#12231d]">{listing?.title ?? "Listing"}</span>
                            <span className="block text-[11px] text-[#747873]">{bookedDays} of 14 nights booked</span>
                          </span>
                          {preview.days.map((status, index) => {
                            const date = calendarDates[index];
                            if (!date) return null;
                            const dateLabel = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-KE", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            });
                            const statusClass =
                              status === "booked"
                                ? "bg-[#315b47]"
                                : status === "blocked"
                                  ? "bg-gray-300"
                                  : "border border-emerald-200 bg-emerald-50 hover:bg-emerald-100";
                            const cell = <span className={`block h-9 w-full rounded-md transition ${statusClass}`} />;
                            return status === "available" ? (
                              <Link
                                key={date}
                                href={`/host/calendar?blockDate=${date}&listing=${encodeURIComponent(preview.id)}`}
                                aria-label={`Block ${dateLabel} for ${listing?.title ?? "listing"}`}
                                title={`${dateLabel}: available, tap to block`}
                                className="rounded-md focus:outline-none focus:ring-2 focus:ring-[#E23E85]"
                              >
                                {cell}
                              </Link>
                            ) : (
                              <span key={date} title={`${dateLabel}: ${status}`} aria-label={`${dateLabel}: ${status}`}>
                                {cell}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ---------- Full width: next arrivals ---------- */}
        <section className={`${card} overflow-hidden lg:col-span-2 lg:row-start-3`}>
          <div className={`${cardHeader} pb-4`}>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[#12231d]">Next arrivals</h2>
              {upcoming.length > 0 && (
                <span className="rounded-md bg-[#f3efe9] px-1.5 py-0.5 text-xs font-semibold tabular-nums text-[#565c57]">
                  {upcoming.length}
                </span>
              )}
            </div>
            <Link href="/host/bookings?status=confirmed" className={linkAccent}>
              View all
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="border-t border-[#12231d]/10 px-5 py-8">
              <p className="text-sm font-semibold text-[#12231d]">
                {hasPublishedListing ? "Your listing is live and visible to guests" : "No stays on the calendar yet"}
              </p>
              <p className="mt-1 text-sm text-[#747873]">
                {hasPublishedListing
                  ? "Before your first guest, check payout details, photos, and house rules."
                  : "Confirmed reservations will appear here with guest and check-in details."}
              </p>
              {hasPublishedListing && (
                <Link href="/host/listings" className={`${linkAccent} mt-3 inline-flex`}>
                  View your live listing
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Column headings (desktop only) */}
              <div className="hidden grid-cols-[52px_minmax(0,1.6fr)_minmax(0,1.1fr)_150px_auto] gap-4 border-y border-[#12231d]/10 bg-[#faf8f4] px-5 py-2.5 text-xs font-medium text-[#656a65] lg:grid">
                <span />
                <span>Guest and listing</span>
                <span>Stay</span>
                <span>Status</span>
                <span className="text-right">Contact</span>
              </div>

              <ul className="divide-y divide-[#12231d]/10 border-t border-[#12231d]/10 lg:border-t-0">
                {upcoming.slice(0, 4).map((booking) => {
                  const urgency = getCheckInUrgency(booking.check_in);
                  const latestDateChange = booking.dateChangeHistory?.[0];
                  const guide = arrivalGuides?.[booking.listing_id];
                  const hasArrivalLocation = Boolean(guide?.arrival_address?.trim() || guide?.arrival_directions?.trim());
                  const hasCheckInSteps = Boolean(guide?.check_in_instructions?.trim());
                  const guideReady = hasArrivalLocation && hasCheckInSteps;
                  const guideEditing = editingArrivalBookingId === booking.id;
                  const guests = (booking.adults_count ?? 0) + (booking.children_count ?? 0);
                  const [dayNumber, monthName] = formatStayDate(booking.check_in).split(" ");

                  return (
                    <li key={booking.id}>
                      <article className="px-4 py-4 sm:px-5">
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 lg:grid-cols-[52px_minmax(0,1.6fr)_minmax(0,1.1fr)_150px_auto]">
                          <div className="flex h-[52px] w-[52px] flex-col items-center justify-center rounded-xl border border-[#12231d]/10 bg-[#faf8f4] text-center">
                            <span className="text-[11px] font-semibold text-[#9C2454]">{monthName}</span>
                            <span className="text-lg font-semibold leading-5 tabular-nums text-[#12231d]">{dayNumber}</span>
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#12231d]">{booking.guest_name ?? "Guest"}</p>
                            <p className="mt-0.5 truncate text-sm text-[#747873]">{booking.listing?.title ?? "Stay booking"}</p>
                          </div>

                          <div className="col-span-2 min-w-0 lg:col-span-1">
                            <p className="text-sm font-medium text-[#12231d]">
                              {formatStayDate(booking.check_in)} to {formatStayDate(booking.check_out)}
                            </p>
                            <p className="mt-0.5 text-sm text-[#747873]">
                              {booking.nights} {booking.nights === 1 ? "night" : "nights"}, {guests} {guests === 1 ? "guest" : "guests"}
                            </p>
                          </div>

                          <div className="col-span-2 flex flex-wrap items-center gap-2 lg:col-span-1">
                            <StatusBadge status={booking.status} />
                            {urgency && <span className="text-xs font-medium text-[#8a5a16]">Check-in {urgency.toLowerCase()}</span>}
                          </div>

                          <div className="col-span-2 flex items-center gap-2 lg:col-span-1 lg:justify-end">
                            {booking.guest_phone && (
                              <>
                                <a
                                  href={`tel:${booking.guest_phone.replace(/[^\d+]/g, "")}`}
                                  aria-label={`Call ${booking.guest_name ?? "guest"}`}
                                  title="Call guest"
                                  className="grid h-9 w-9 place-items-center rounded-full border border-[#12231d]/15 text-[#315b47] transition hover:bg-[#f9f6f1] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40"
                                >
                                  <Phone className="h-4 w-4" aria-hidden="true" />
                                </a>
                                <a
                                  href={`https://wa.me/${toWhatsAppNumber(booking.guest_phone)}?text=${encodeURIComponent(
                                    `Hi ${booking.guest_name ?? "there"}, this is your host about your upcoming stay at ${booking.listing?.title ?? "my listing"}.`,
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`WhatsApp ${booking.guest_name ?? "guest"}`}
                                  title="WhatsApp guest"
                                  className="grid h-9 w-9 place-items-center rounded-full bg-[#315b47] text-white transition hover:bg-[#244a38] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40"
                                >
                                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                                </a>
                              </>
                            )}
                            <Link
                              href={`/host/bookings?status=confirmed&booking=${encodeURIComponent(booking.id)}`}
                              className="inline-flex min-h-9 items-center rounded-full border border-[#12231d]/15 px-3 text-xs font-semibold text-[#12231d] transition hover:bg-[#f9f6f1]"
                            >
                              Details
                            </Link>
                          </div>
                        </div>

                        {latestDateChange && (
                          <div className="mt-3 rounded-xl border border-[#E23E85]/25 bg-[#FCE8F0] px-3 py-2">
                            <p className="text-xs font-semibold text-[#9C2454]">Dates updated</p>
                            <p className="mt-0.5 text-xs text-[#5F2740]">
                              {latestDateChange.current_check_in} to {latestDateChange.current_check_out}
                              <span className="px-1.5" aria-hidden="true">→</span>
                              <span className="font-semibold">
                                {latestDateChange.requested_check_in} to {latestDateChange.requested_check_out}
                              </span>
                            </p>
                          </div>
                        )}

                        {/* Arrival guide strip */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-[#faf8f4] px-3.5 py-2.5">
                          <div className="flex items-center gap-2 text-sm text-[#565c57]">
                            <MapPin className="h-4 w-4 shrink-0 text-[#747873]" aria-hidden="true" />
                            <span>Arrival location and check-in steps</span>
                            {arrivalGuideError ? (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-[#747873]">Unavailable</span>
                            ) : guideReady ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-[#397653]">Ready</span>
                            ) : (
                              <span className="rounded-full bg-[#fff0d8] px-2 py-0.5 text-xs font-semibold text-[#9a5b00]">Needs details</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4">
                            {arrivalGuideError ? (
                              <Link
                                href={`/host/listings/${encodeURIComponent(booking.listing_id)}`}
                                className="text-xs font-semibold text-[#365d80] hover:underline"
                              >
                                View listing details
                              </Link>
                            ) : (
                              <button
                                type="button"
                                aria-expanded={guideEditing}
                                onClick={() => setEditingArrivalBookingId(guideEditing ? null : booking.id)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#315b47] hover:underline"
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                {guideEditing ? "Close arrival guide" : guideReady ? "Review arrival guide" : "Complete arrival guide"}
                              </button>
                            )}
                            <Link
                              href={`/host/bookings/${encodeURIComponent(booking.id)}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#9C2454] hover:underline"
                            >
                              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              Contact customer support
                            </Link>
                          </div>
                        </div>

                        {guideEditing && !arrivalGuideError && (
                          <ArrivalGuideQuickEdit
                            key={booking.listing_id}
                            listingId={booking.listing_id}
                            initialGuide={guide ?? null}
                            onSaved={(updatedGuide) =>
                              setArrivalGuides((current) => ({ ...current, [booking.listing_id]: updatedGuide }))
                            }
                          />
                        )}
                      </article>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* ---------- Side rail, bottom: listings + help ---------- */}
        <div className="space-y-6 lg:col-start-2 lg:row-start-2">
          <section className={card}>
            <div className={cardHeader}>
              <h2 className="text-lg font-semibold text-[#12231d]">My listings</h2>
              <Link href="/host/listings" className={linkAccent}>
                View all
              </Link>
            </div>
            {listings.length === 0 ? (
              <div className="p-5">
                <p className="text-sm font-semibold text-[#12231d]">
                  {hasActiveOrDraftListings === false ? "Your hosting setup is just getting started" : "No listings yet"}
                </p>
                <p className="mt-1 text-sm text-[#747873]">
                  Our team sets up and publishes listings during verification. Make sure your payout details, photos and house rules are ready.
                </p>
                <Link href="/host/listings" className={`${linkAccent} mt-3 inline-flex`}>
                  Check listing status
                </Link>
              </div>
            ) : (
              <ul className="space-y-2.5 p-5">
                {listings.slice(0, 3).map((listing) => {
                  const cover = [...(listing.listing_images ?? [])].sort((left, right) => left.sort_order - right.sort_order)[0]?.url;
                  const statusLabel =
                    listing.status === "published" ? "Live" : listing.status === "suspended" ? "Suspended" : "Pending review";
                  const statusStyle =
                    listing.status === "published"
                      ? "bg-emerald-50 text-emerald-800"
                      : listing.status === "suspended"
                        ? "bg-red-50 text-red-800"
                        : "bg-amber-50 text-amber-800";
                  return (
                    <li key={listing.id} className="flex items-center gap-3 rounded-xl border border-[#E9E6DD] p-2.5">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f3efe9]">
                        {cover && <Image src={cover} alt="" fill sizes="56px" unoptimized className="object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#12231d]">{listing.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle}`}>{statusLabel}</span>
                          <Link href={`/host/listings/${listing.id}/edit`} className="text-xs font-semibold text-[#9C2454] hover:underline">
                            Request a change
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={`${card} p-5`}>
            <h2 className="text-lg font-semibold text-[#12231d]">Need help?</h2>
            <p className="mt-0.5 text-sm text-[#747873]">Our team is a call or message away.</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <a
                href="tel:0183191903"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#12231d]/15 px-3 text-sm font-semibold text-[#12231d] transition hover:bg-[#f9f6f1]"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> Call
              </a>
              <a
                href={`https://wa.me/254183191903?text=${encodeURIComponent(`Hi, I need help with my host dashboard. Host: ${hostName}.`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#315b47] px-3 text-sm font-semibold text-white transition hover:bg-[#244a38]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}