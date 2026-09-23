// app/host/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHostDashboardData } from "@/app/lib/host/actions";
import type { HostDashboardStats, Listing, Booking } from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? "text-[#12231d]"}`}>{value}</p>
    </div>
  );
}

export default function HostDashboardPage() {
  const [stats, setStats] = useState<HostDashboardStats | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [pending, setPending] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getHostDashboardData();
      setStats(data.stats);
      setListings(data.listings);
      setPending(data.pending);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-gray-500">Loading your dashboard…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#12231d]">Welcome back</h1>
        <p className="text-gray-500">Here&apos;s how your properties are doing.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active listings" value={stats?.active_listings ?? 0} />
        <StatCard label="Drafts" value={stats?.draft_listings ?? 0} />
        <StatCard label="Pending requests" value={stats?.pending_bookings ?? 0} accent="text-[#b9770e]" />
        <StatCard label="Upcoming stays" value={stats?.upcoming_bookings ?? 0} />
        <StatCard
          label="Balance owed to you"
          value={`KES ${Number(stats?.balance_owed ?? 0).toLocaleString()}`}
          accent="text-[#ec1561]"
        />
        <StatCard
          label="Lifetime paid out"
          value={`KES ${Number(stats?.lifetime_paid_out ?? 0).toLocaleString()}`}
        />
      </div>

      {pending.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-[#12231d]">Booking requests needing a response</h2>
            <Link href="/host/bookings" className="text-sm font-medium text-[#ec1561]">
              View all
            </Link>
          </div>
          <ul className="divide-y">
            {pending.slice(0, 5).map((b) => (
              <li key={b.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-[#12231d]">{b.listing?.title}</p>
                  <p className="text-gray-500">
                    {b.check_in} → {b.check_out} · {b.guests_count} guests · {b.guest_name}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-[#12231d]">Your listings</h2>
          <Link href="/host/listings" className="text-sm font-medium text-[#ec1561]">
            Manage all
          </Link>
        </div>
        {listings.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            You haven&apos;t published anything yet.{" "}
            <Link href="/host/listings/new" className="font-medium text-[#ec1561]">
              Create your first listing
            </Link>
          </p>
        ) : (
          <ul className="divide-y">
            {listings.slice(0, 5).map((l) => (
              <li key={l.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-[#12231d]">{l.title}</p>
                  <p className="text-gray-500">
                    {l.town}, {l.county} · KES {l.price_per_night.toLocaleString()}/night
                  </p>
                </div>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
