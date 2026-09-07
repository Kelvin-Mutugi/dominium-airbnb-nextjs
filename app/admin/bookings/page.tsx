// app/admin/bookings/page.tsx
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { BookingTabs } from "@/components/admin/bookings/tabs";
import { BookingRowActions } from "@/components/admin/bookings/booking-row-actions";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = status ?? "pending";

  const admin = getSupabaseAdmin();
  const { data: bookings } = await admin
    .from("bookings")
    .select(
      `id, check_in, check_out, guests_count, status, total_amount,
       commission_amount, host_payout_amount, created_at,
       listing:listing_id ( title, town, county ),
       guest:guest_id ( full_name, phone ),
       host:host_id ( full_name, business_name )`
    )
    .eq("status", activeStatus)
    .order("check_in", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1 text-[#E23E85]">Bookings</h1>
      <p className="text-sm text-gray-600 mb-4">
        Review bookings, confirm pending ones, and cancel when needed.
      </p>

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
            {(bookings ?? []).map((b: any) => (
              <tr key={b.id}>
                <td className="p-3 text-[#1B1A2E]">
                  {b.listing?.title}
                  <div className="text-xs text-gray-500">
                    {b.listing?.town}, {b.listing?.county}
                  </div>
                </td>
                <td className="p-3 text-[#1B1A2E]">{b.guest?.full_name}</td>
                <td className="p-3 text-[#1B1A2E]">
                  {b.host?.business_name ?? b.host?.full_name}
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
              </tr>
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