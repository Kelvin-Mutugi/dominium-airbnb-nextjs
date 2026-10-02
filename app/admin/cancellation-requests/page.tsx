import Link from "next/link";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { CancellationRequestActions } from "@/components/admin/bookings/cancellation-request-actions";

type CancellationRequest = {
  id: string;
  booking_id: string;
  current_check_in: string;
  current_check_out: string;
  amount_paid: number | string;
  refund_percent: number;
  estimated_refund_amount: number | string;
  reason: string | null;
  created_at: string;
  booking: {
    booking_reference: string;
    guest_name: string | null;
    listing?: { title?: string } | Array<{ title?: string }> | null;
  } | Array<{
    booking_reference: string;
    guest_name: string | null;
    listing?: { title?: string } | Array<{ title?: string }> | null;
  }> | null;
};

export default async function AdminCancellationRequestsPage() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("booking_change_requests")
    .select("id, booking_id, current_check_in, current_check_out, amount_paid, refund_percent, estimated_refund_amount, reason, created_at, booking:bookings!inner(booking_reference, guest_name, listing:listings(title))")
    .eq("request_type", "cancellation")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error("Unable to load cancellation requests.");
  const requests = (data ?? []) as unknown as CancellationRequest[];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Cancellation Requests</h1>
        <p className="mt-1 text-sm text-gray-600">
          Decide whether to cancel the booking. Eligible refund requests go to the separate Refunds section for review; approval here does not send money.
        </p>
      </header>

      <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <p className="text-sm font-medium text-gray-700">Awaiting review</p>
        <span className="rounded-full bg-[#FCE8F0] px-3 py-1 text-sm font-semibold text-[#9C2454]">
          {requests.length}
        </span>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
          No cancellation requests are waiting for review.
        </p>
      ) : (
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {requests.map((request) => {
            const booking = Array.isArray(request.booking) ? request.booking[0] : request.booking;
            const listing = Array.isArray(booking?.listing) ? booking.listing[0] : booking?.listing;

            return (
              <article key={request.id} className="flex flex-col justify-between gap-4 p-4 sm:p-5 md:flex-row md:items-start">
                <div className="min-w-0 space-y-1">
                  <Link
                    href={`/admin/bookings/${request.booking_id}`}
                    className="font-semibold text-[#1B1A2E] hover:text-[#CF2F74]"
                  >
                    {listing?.title ?? "Booking"} · {booking?.booking_reference ?? request.booking_id.slice(0, 8)}
                  </Link>
                  <p className="text-sm text-gray-600">Guest: {booking?.guest_name ?? "Guest"}</p>
                  <p className="text-sm text-gray-600">Stay: {request.current_check_in} to {request.current_check_out}</p>
                  <p className="text-sm text-gray-600">
                    Estimated refund: KES {Number(request.estimated_refund_amount).toLocaleString("en-KE")} ({request.refund_percent}% of KES {Number(request.amount_paid).toLocaleString("en-KE")})
                  </p>
                  <p className="text-xs text-gray-500">
                    Requested {new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(request.created_at))}
                  </p>
                  {request.reason && (
                    <p className="whitespace-pre-wrap pt-1 text-sm text-gray-500">Guest note: {request.reason}</p>
                  )}
                </div>
                <CancellationRequestActions
                  requestId={request.id}
                />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
