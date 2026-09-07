// app/admin/page.tsx
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import Link from "next/link";

async function getDashboardStats() {
  const admin = getSupabaseAdmin();

  const [
    { count: totalListings },
    { count: pendingListings },
    { count: pendingBookings },
    { count: activeUsers },
    { data: payoutRows },
    { data: recentBookings },
  ] = await Promise.all([
    admin.from("listings").select("*", { count: "exact", head: true }),
    admin
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    admin.from("payouts").select("amount").eq("status", "owed"),
    admin
      .from("bookings")
      .select("id, check_in, check_out, status, total_amount, listing_id, guest_id")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const payoutsOwed =
    payoutRows?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;

  return {
    totalListings: totalListings ?? 0,
    pendingListings: pendingListings ?? 0,
    pendingBookings: pendingBookings ?? 0,
    activeUsers: activeUsers ?? 0,
    payoutsOwed,
    recentBookings: recentBookings ?? [],
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Listings"
          value={stats.totalListings}
          href="/admin/listings"
        />
        <StatCard
          label="Pending Approval"
          value={stats.pendingListings}
          href="/admin/listings?status=pending"
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

      <StatCard
        label="Payouts Owed to Hosts"
        value={`KES ${stats.payoutsOwed.toLocaleString()}`}
        href="/admin/payouts"
      />

      <div>
        <h2 className="text-2xl font-semibold text-[#E23E85] mb-4 mt-6">Recent Bookings</h2>
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {stats.recentBookings.length === 0 && (
            <p className="p-4 text-sm text-gray-500">No bookings yet.</p>
          )}
          {stats.recentBookings.map((b) => (
            <div 
              key={b.id}
              className="p-4 flex items-center justify-between text-sm text-gray-200"
            >
              <span className="text-gray-500">
                {b.check_in} → {b.check_out}
              </span>
              <span className="capitalize text-gray-500">{b.status}</span>
              <span className="text-gray-500">KES {Number(b.total_amount).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}