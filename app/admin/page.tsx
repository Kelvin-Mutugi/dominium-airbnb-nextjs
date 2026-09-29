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
    { data: payoutRows, count: owedPayoutCount },
    { data: recentBookingRows },
    { data: pendingListingQueue, count: pendingListingCount },
    { data: pendingBookingQueue, count: pendingBookingCount },
    { data: pendingHostQueue, count: pendingHostCount },
    { data: openSupportQueue, count: openSupportCount },
    { data: owedPayoutQueue },
    { data: propertyRequestQueue, count: propertyRequestCount },
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
    admin.from("payouts").select("amount", { count: "exact" }).eq("status", "owed"),
    admin
      .from("bookings")
      .select("id, listing_id, guest_id, check_in, check_out, status, total_amount, guest_name")
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("listings")
      .select("id, title, town, county, created_at", { count: "exact" })
      .eq("status", "pending_review")
      .order("created_at", { ascending: true })
      .limit(5),
    admin
      .from("bookings")
      .select("id, guest_name, created_at", { count: "exact" })
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5),
    admin
      .from("profiles")
      .select("id, full_name, business_name, kyc_submitted_at", { count: "exact" })
      .eq("role", "host")
      .eq("kyc_status", "pending")
      .order("kyc_submitted_at", { ascending: true, nullsFirst: true })
      .limit(5),
    admin
      .from("support_cases")
      .select("id, subject, status, created_at", { count: "exact" })
      .in("status", ["new", "in_review", "waiting_on_user"])
      .order("created_at", { ascending: true })
      .limit(5),
    admin
      .from("payouts")
      .select("id, amount, status, created_at", { count: "exact" })
      .eq("status", "owed")
      .order("created_at", { ascending: true })
      .limit(5),
    admin
      .from("host_listing_requests")
      .select("id, host_id, proposed_title, property_type, town, county, created_at", { count: "exact" })
      .in("status", ["submitted", "reviewing", "visit_scheduled", "visited", "details_collected"])
      .order("created_at", { ascending: true })
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
    owedPayoutCount: owedPayoutCount ?? 0,
    workQueues: [
      {
        id: "listings",
        title: "Listing review",
        count: pendingListingCount ?? 0,
        href: "/admin/listings?status=pending_review",
        items: (pendingListingQueue ?? []).map((item) => ({
          id: item.id,
          label: item.title ?? "Untitled listing",
          meta: [item.town, item.county].filter(Boolean).join(", ") || "Location not set",
          href: `/admin/listings/${item.id}`,
        })),
      },
      {
        id: "bookings",
        title: "Booking confirmation",
        count: pendingBookingCount ?? 0,
        href: "/admin/bookings?status=pending",
        items: (pendingBookingQueue ?? []).map((item) => ({
          id: item.id,
          label: item.guest_name ?? `Booking ${item.id.slice(0, 8)}`,
          meta: `Received ${new Date(item.created_at).toLocaleDateString("en-KE")}`,
          href: `/admin/bookings/${item.id}`,
        })),
      },
      {
        id: "verification",
        title: "Host verification",
        count: pendingHostCount ?? 0,
        href: "/admin/verification",
        items: (pendingHostQueue ?? []).map((item) => ({
          id: item.id,
          label: item.business_name ?? item.full_name ?? "Host application",
          meta: item.kyc_submitted_at
            ? `Submitted ${new Date(item.kyc_submitted_at).toLocaleDateString("en-KE")}`
            : "Submission date unavailable",
          href: "/admin/verification",
        })),
      },
      {
        id: "support",
        title: "Open support cases",
        count: openSupportCount ?? 0,
        href: "/admin/support?status=all",
        items: (openSupportQueue ?? []).map((item) => ({
          id: item.id,
          label: item.subject,
          meta: `${item.status.replaceAll("_", " ")} · ${new Date(item.created_at).toLocaleDateString("en-KE")}`,
          href: "/admin/support?status=all",
        })),
      },
      {
        id: "payouts",
        title: "Payouts owed",
        count: owedPayoutCount ?? 0,
        href: "/admin/payouts?view=payouts&status=owed",
        items: (owedPayoutQueue ?? []).map((item) => ({
          id: item.id,
          label: `KES ${Number(item.amount).toLocaleString()}`,
          meta: `Owed since ${new Date(item.created_at).toLocaleDateString("en-KE")}`,
          href: "/admin/payouts?view=payouts&status=owed",
        })),
      },
      {
        id: "property-requests",
        title: "Property visit requests",
        count: propertyRequestCount ?? 0,
        href: "/admin/listing-requests?status=all",
        items: (propertyRequestQueue ?? []).map((item) => ({
          id: item.id,
          label: item.proposed_title,
          meta: `${item.property_type} · ${item.town}, ${item.county} · ${new Date(item.created_at).toLocaleDateString("en-KE")}`,
          href: "/admin/listing-requests?status=all",
        })),
      },
    ],
    recentBookings: recentBookings.map((booking) => ({
      ...booking,
      listing_title: listingTitles.get(booking.listing_id),
      related_guest_name: booking.guest_id ? guestNames.get(booking.guest_id) : null,
    })),
  };
}

function QueuePanel({
  title,
  count,
  href,
  items,
}: {
  title: string;
  count: number;
  href: string;
  items: { id: string; label: string; meta: string; href: string }[];
}) {
  return (
    <section className="min-w-0 border-y bg-white">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-[#1B1A2E]">{title}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{count}</span>
      </header>
      {items.length ? (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="block px-4 py-3 hover:bg-gray-50">
                <span className="block truncate text-sm font-medium text-[#1B1A2E]">{item.label}</span>
                <span className="mt-1 block truncate text-xs text-gray-500">{item.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-sm text-gray-500">Nothing needs attention.</p>
      )}
      <Link href={href} className="block border-t px-4 py-2.5 text-xs font-semibold text-[#CF2F74] hover:bg-[#FDF0F5]">
        View queue
      </Link>
    </section>
  );
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

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#E23E85]">Work queues</h2>
            <p className="mt-1 text-sm text-gray-600">Oldest outstanding items are shown first.</p>
          </div>
          <Link href="/admin/audit-log" className="text-sm font-medium text-[#CF2F74] hover:underline">View audit log</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {stats.workQueues.map((queue) => (
            <QueuePanel key={queue.id} {...queue} />
          ))}
        </div>
      </section>

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