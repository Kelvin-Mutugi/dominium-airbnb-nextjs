// app/host/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHostDashboardData, getHostVerificationStatus } from "@/app/lib/host/actions";
import type { HostDashboardStats, Booking } from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";

function StatCard({ label, value, href, accent }: { label: string; value: string | number; href: string; accent?: string }) {
  return (
    <Link href={href} className="block rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#ec1561]/40">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? "text-[#12231d]"}`}>{value}</p>
    </Link>
  );
}

export default function HostDashboardPage() {
  const [stats, setStats] = useState<HostDashboardStats | null>(null);
  const [pending, setPending] = useState<Booking[]>([]);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
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
        const [data, setup] = await Promise.all([
          getHostDashboardData(),
          getHostVerificationStatus().catch((statusError: unknown) => {
            console.error("Failed to load host verification status:", statusError);
            return null;
          }),
        ]);
        if (!active) return;
        setStats(data.stats);
        setPending(data.pending);
        setUpcoming(data.upcoming);
        setOnboardingStatus(setup);
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

  if (loading) return <p className="text-gray-500">Loading your dashboard…</p>;

  if (error) {
    return (
      <div role="alert" className="max-w-xl rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        <p>{error}</p>
        <button onClick={retryLoading} className="mt-3 font-semibold underline underline-offset-2">
          Try again
        </button>
      </div>
    );
  }

  const isVerified = Boolean(onboardingStatus?.host_verified_at) || onboardingStatus?.kyc_status === "approved";
  const hasNoListings = stats?.active_listings === 0 && stats.draft_listings === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#12231d]">Welcome back</h1>
        <p className="text-gray-500">Here&apos;s how your properties are doing.</p>
      </div>

      {onboardingStatus && !isVerified && (
        <section className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${onboardingStatus.kyc_status === "rejected" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
          <div>
            <h2 className="font-semibold text-[#12231d]">
              {onboardingStatus.kyc_status === "pending"
                ? "Host verification is under review"
                : onboardingStatus.kyc_status === "rejected"
                  ? "Host verification needs an update"
                  : "Complete your host verification"}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {onboardingStatus.kyc_status === "pending"
                ? "You can keep managing your listings while we review your application."
                : onboardingStatus.kyc_status === "rejected"
                  ? onboardingStatus.kyc_rejection_reason ?? "Review the requested changes and resubmit your details."
                  : "Finish setting up your host account to keep bookings and payouts moving."}
            </p>
          </div>
          <Link
            href={onboardingStatus.kyc_status === "pending" ? "/host/pending-review" : "/host/onboarding"}
            className="shrink-0 text-sm font-semibold text-[#12231d] underline underline-offset-4"
          >
            {onboardingStatus.kyc_status === "pending" ? "View application" : "Continue verification"}
          </Link>
        </section>
      )}

      {hasNoListings && (
        <section className="flex flex-col gap-4 rounded-xl border border-[#12231d]/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[#12231d]">No bookable listings yet</h2>
            <p className="mt-1 text-sm text-gray-500">Create or update a listing to start receiving booking requests.</p>
          </div>
          <Link href="/host/listings/new" className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#12231d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243c34]">
            Create listing
          </Link>
        </section>
      )}

      {stats === null && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Summary totals are unavailable right now. Booking information below is still up to date.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active listings" value={stats?.active_listings ?? "—"} href="/host/listings" />
        <StatCard label="Drafts" value={stats?.draft_listings ?? "—"} href="/host/listings" />
        <StatCard label="Pending requests" value={stats?.pending_bookings ?? pending.length} href="/host/bookings?status=pending" accent="text-[#b9770e]" />
        <StatCard label="Upcoming stays" value={stats?.upcoming_bookings ?? upcoming.length} href="/host/bookings?status=confirmed" />
        <StatCard
          label="Balance owed to you"
          value={stats ? `KES ${Number(stats.balance_owed ?? 0).toLocaleString()}` : "—"}
          href="/host/payouts"
          accent="text-[#ec1561]"
        />
        <StatCard
          label="Lifetime paid out"
          value={stats ? `KES ${Number(stats.lifetime_paid_out ?? 0).toLocaleString()}` : "—"}
          href="/host/payouts"
        />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-[#12231d]">Booking requests needing a response</h2>
          <Link href="/host/bookings?status=pending" className="shrink-0 text-sm font-medium text-[#ec1561]">
            View all
          </Link>
        </div>
        {pending.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">No requests need a response right now.</p>
        ) : (
          <ul className="divide-y">
            {pending.slice(0, 5).map((booking) => {
              const urgency = getCheckInUrgency(booking.check_in);
              return (
                <li key={booking.id}>
                  <Link href={`/host/bookings?status=pending&booking=${encodeURIComponent(booking.id)}`} className="flex items-center justify-between gap-4 py-3 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#ec1561]/40">
                    <div>
                      <p className="font-medium text-[#12231d]">{booking.listing?.title}</p>
                      <p className="text-gray-500">
                        {booking.check_in} → {booking.check_out} · {booking.guests_count} guests · {booking.guest_name}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      {urgency && <span className="font-semibold text-rose-700">{urgency}</span>}
                      <StatusBadge status={booking.status} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-[#12231d]">Upcoming stays</h2>
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/host/calendar" className="text-sm font-medium text-[#12231d]">Open calendar</Link>
            <Link href="/host/bookings?status=confirmed" className="text-sm font-medium text-[#ec1561]">View all</Link>
          </div>
        </div>
        {upcoming.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No upcoming stays booked. Your reservations and blocked dates will appear on the <Link href="/host/calendar" className="font-medium text-[#ec1561] underline">calendar</Link>.
          </p>
        ) : (
          <ul className="divide-y">
            {upcoming.slice(0, 5).map((booking) => {
              const urgency = getCheckInUrgency(booking.check_in);
              return (
                <li key={booking.id}>
                  <Link href={`/host/bookings?status=confirmed&booking=${encodeURIComponent(booking.id)}`} className="flex items-center justify-between gap-4 py-3 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#ec1561]/40">
                    <div>
                      <p className="font-medium text-[#12231d]">{booking.listing?.title}</p>
                      <p className="text-gray-500">
                        {booking.check_in} → {booking.check_out} · {booking.guests_count} guests · {booking.guest_name}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      {urgency && <span className="font-semibold text-amber-700">{urgency}</span>}
                      <StatusBadge status={booking.status} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
