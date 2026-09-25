// app/admin/page.tsx
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import Link from "next/link";

async function getDashboardStats() {
  const admin = getSupabaseAdmin();

  const [
    { count: totalListings },
    { count: pendingListings },
    { count: publishedListings },
    { count: pendingBookings },
    { count: confirmedBookings },
    { count: totalUsers },
    { count: activeUsers },
    { count: suspendedUsers },
    { data: payoutRows },
    { data: recentBookingRows },
  ] = await Promise.all([
    admin.from("listings").select("*", { count: "exact", head: true }),
    admin
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_review"),
    admin
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    admin
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed"),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", "suspended"),
    admin.from("payouts").select("amount").eq("status", "owed"),
    admin
      .from("bookings")
      .select("id, listing_id, guest_id, check_in, check_out, status, total_amount, guest_name")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const recentBookings = recentBookingRows ?? [];
  const listingIds = [...new Set(recentBookings.map((booking) => booking.listing_id).filter(Boolean))];
  const guestIds = [...new Set(recentBookings.map((booking) => booking.guest_id).filter(Boolean))];
  const [{ data: listings }, { data: guests }] = await Promise.all([
    listingIds.length
      ? admin.from("listings").select("id, title").in("id", listingIds)
      : Promise.resolve({ data: [] }),
    guestIds.length
      ? admin.from("profiles").select("id, full_name").in("id", guestIds)
      : Promise.resolve({ data: [] }),
  ]);
  const listingTitles = new Map((listings ?? []).map((listing) => [listing.id, listing.title]));
  const guestNames = new Map((guests ?? []).map((guest) => [guest.id, guest.full_name]));

  const payoutsOwed =
    payoutRows?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;

  return {
    totalListings: totalListings ?? 0,
    pendingListings: pendingListings ?? 0,
    publishedListings: publishedListings ?? 0,
    pendingBookings: pendingBookings ?? 0,
    confirmedBookings: confirmedBookings ?? 0,
    totalUsers: totalUsers ?? 0,
    activeUsers: activeUsers ?? 0,
    suspendedUsers: suspendedUsers ?? 0,
    payoutsOwed,
    recentBookings: recentBookings.map((booking) => ({
      ...booking,
      listing_title: listingTitles.get(booking.listing_id),
      related_guest_name: booking.guest_id ? guestNames.get(booking.guest_id) : null,
    })),
  };
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <div className="p-4 border rounded-lg bg-white shadow-sm hover:shadow transition">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-500">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Dashboard</h1>
        <p className="text-sm text-gray-600">
          Overview of listings, bookings, and payouts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Listings"
          value={stats.totalListings}
          href="/admin/listings"
        />
        <StatCard
          label="Pending Approval"
          value={stats.pendingListings}
          href="/admin/listings?status=pending_review"
        />
        <StatCard
          label="Published Listings"
          value={stats.publishedListings}
          href="/admin/listings?status=published"
        />
        <StatCard
          label="Pending Bookings"
          value={stats.pendingBookings}
          href="/admin/bookings?status=pending"
        />
        <StatCard
          label="Active Users"
          value={stats.activeUsers}
          href="/admin/users"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Users" value={stats.totalUsers} href="/admin/users" />
        <StatCard label="Suspended Users" value={stats.suspendedUsers} href="/admin/users" />
        <StatCard label="Confirmed Bookings" value={stats.confirmedBookings} href="/admin/bookings?status=confirmed" />
        <StatCard
          label="Payouts Owed to Hosts"
          value={`KES ${stats.payoutsOwed.toLocaleString()}`}
          href="/admin/payouts"
        />
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-[#E23E85] mb-4 mt-6">Recent Bookings</h2>
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {stats.recentBookings.length === 0 && (
            <p className="p-4 text-sm text-gray-500">No bookings yet.</p>
          )}
          {stats.recentBookings.map((b) => (
            <Link
              key={b.id}
              href={`/admin/bookings/${b.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-4 p-4 text-sm hover:bg-gray-50"
            >
              <span className="min-w-0 flex-1 text-gray-700">
                <span className="block truncate font-medium">
                  {b.listing_title ?? "Listing"}
                </span>
                <span className="block text-xs text-gray-500">
                  {b.guest_name ?? b.related_guest_name ?? "Guest checkout"}
                </span>
              </span>
              <span className="shrink-0 text-gray-500">
                {b.check_in} → {b.check_out}
              </span>
              <span className="shrink-0 capitalize text-gray-500">{b.status}</span>
              <span className="shrink-0 text-gray-500">KES {Number(b.total_amount).toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}