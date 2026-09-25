// app/admin/bookings/page.tsx
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import Link from "next/link";
import { BookingTabs } from "@/components/admin/bookings/tabs";
import { BookingRowActions } from "@/components/admin/bookings/booking-row-actions";
import { ClickableBookingRow } from "@/components/admin/bookings/clickable-booking-row";
import { AdminSearchInput } from "@/components/admin/search-input";

function escapeSearchTerm(value: string) {
  return value.trim().slice(0, 100).replace(/[%,()]/g, "");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

type AdminBooking = {
  id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  guest_name: string | null;
  status: string;
  total_amount: number | string;
  listing?: { title?: string; town?: string; county?: string } | Array<{ title?: string; town?: string; county?: string }> | null;
  guest?: { full_name?: string; phone?: string } | Array<{ full_name?: string; phone?: string }> | null;
  host?: { full_name?: string; business_name?: string } | Array<{ full_name?: string; business_name?: string }> | null;
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const activeStatus = status ?? "pending";
  const searchTerm = escapeSearchTerm(q ?? "");

  const admin = getSupabaseAdmin();
  let bookingsQuery = admin
    .from("bookings")
    .select(
      `id, check_in, check_out, guests_count, guest_name, status, total_amount,
       commission_amount, host_payout_amount, created_at,
       listing:listing_id ( title, town, county ),
       guest:guest_id ( full_name, phone ),
       host:host_id ( full_name, business_name )`
    )
    .eq("status", activeStatus);

  if (searchTerm) {
    const pattern = `%${searchTerm}%`;
    const [matchingProfiles, matchingListings] = await Promise.all([
      admin
        .from("profiles")
        .select("id")
        .or(
          `full_name.ilike.${pattern},business_name.ilike.${pattern},phone.ilike.${pattern}`,
        ),
      admin
        .from("listings")
        .select("id")
        .or(`title.ilike.${pattern},town.ilike.${pattern},county.ilike.${pattern}`),
    ]);

    const searchFields = [
      `guest_name.ilike.${pattern}`,
      `guest_email.ilike.${pattern}`,
      `guest_phone.ilike.${pattern}`,
    ];

    if (isUuid(searchTerm)) searchFields.push(`id.eq.${searchTerm}`);
    if (isDate(searchTerm)) {
      searchFields.push(`check_in.eq.${searchTerm}`, `check_out.eq.${searchTerm}`);
    }

    const profileIds = (matchingProfiles.data ?? []).map((profile) => profile.id);
    const listingIds = (matchingListings.data ?? []).map((listing) => listing.id);
    if (profileIds.length) {
      const ids = profileIds.join(",");
      searchFields.push(`guest_id.in.(${ids})`, `host_id.in.(${ids})`);
    }
    if (listingIds.length) searchFields.push(`listing_id.in.(${listingIds.join(",")})`);

    bookingsQuery = searchFields.length
      ? bookingsQuery.or(searchFields.join(","))
      : bookingsQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: bookings } = await bookingsQuery.order("check_in", {
    ascending: true,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1 text-[#E23E85]">Bookings</h1>
      <p className="text-sm text-gray-600 mb-4">
        Review bookings, confirm pending ones, and cancel when needed.
      </p>

      <AdminSearchInput placeholder="Search by guest, host, listing, email, date, or booking ID" />
      <BookingTabs />

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-3">Listing</th>
              <th className="p-3">Guest</th>
              <th className="p-3">Host</th>
              <th className="p-3">Dates</th>
              <th className="p-3">Guests</th>
              <th className="p-3">Total</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(bookings ?? []).map((b: AdminBooking) => (
              (() => {
                const listing = Array.isArray(b.listing) ? b.listing[0] : b.listing;
                const guest = Array.isArray(b.guest) ? b.guest[0] : b.guest;
                const host = Array.isArray(b.host) ? b.host[0] : b.host;

                return (
              <ClickableBookingRow key={b.id} bookingId={b.id}>
                <td className="p-3 text-[#1B1A2E]">
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-[#E23E85]"
                  >
                    {listing?.title}
                  </Link>
                  <div className="text-xs text-gray-500">
                    {listing?.town}, {listing?.county}
                  </div>
                </td>
                <td className="p-3 text-[#1B1A2E]">
                  {b.guest_name ?? guest?.full_name ?? "Guest checkout"}
                </td>
                <td className="p-3 text-[#1B1A2E]">
                  {host?.business_name ?? host?.full_name}
                </td>
                <td className="p-3 text-[#1B1A2E]">
                  {b.check_in} → {b.check_out}
                </td>
                <td className="p-3 text-[#1B1A2E]">{b.guests_count}</td>
                <td className="p-3 text-[#1B1A2E]">
                  KES {Number(b.total_amount).toLocaleString()}
                </td>
                <td className="p-3 text-[#1B1A2E]">
                  <BookingRowActions bookingId={b.id} status={b.status} />
                </td>
              </ClickableBookingRow>
                );
              })()
            ))}
            {(bookings ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  No {activeStatus} bookings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}