import { requireAdmin } from "@/app/lib/admin-auth";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { CollectionFeeReconciliation } from "@/components/admin/payouts/CollectionFeeReconciliation";

type DarajaPaymentAttempt = {
  id: string;
  booking_id: string;
  amount: number | string;
  status: string;
  mpesa_receipt_number: string | null;
};

type BookingInfo = {
  id: string;
  booking_reference: string;
  guest_name: string | null;
};

export default async function CollectionFeeReconciliationPage() {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data: attempts, error: attemptError } = await admin
    .from("daraja_payment_attempts")
    .select("id, booking_id, amount, status, mpesa_receipt_number")
    .in("status", ["succeeded", "late_success"])
    .is("actual_collection_fee", null)
    .order("paid_at", { ascending: true })
    .limit(200);
  if (attemptError) throw new Error("Unable to load unreconciled Safaricom collection fees.");

  const attemptRows = (attempts ?? []) as unknown as DarajaPaymentAttempt[];
  const bookingIds = [...new Set(attemptRows.map((attempt) => attempt.booking_id))];
  const { data: bookings, error: bookingError } = bookingIds.length
    ? await admin.from("bookings").select("id, booking_reference, guest_name").in("id", bookingIds)
    : { data: [], error: null };
  if (bookingError) throw new Error("Unable to load bookings for fee reconciliation.");
  const bookingById = new Map(
    ((bookings ?? []) as unknown as BookingInfo[]).map((booking) => [booking.id, booking]),
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Safaricom fee reconciliation</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
          Record actual STK collection fees from Safaricom&apos;s transaction statement. Reconciliation updates the host fee balance and releases an otherwise eligible completed-booking payout.
        </p>
      </header>
      <p className="border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Do not estimate this fee. Use the actual fee from the authoritative Safaricom record; duplicate submissions with the same amount are safe, while conflicting corrections require a separate audited adjustment.
      </p>
      {attemptRows.length === 0 ? (
        <p className="border-y border-gray-200 py-10 text-center text-sm text-gray-500">No successful STK collection fees need reconciliation.</p>
      ) : (
        <div className="divide-y divide-gray-200 border-y border-gray-200">
          {attemptRows.map((attempt) => {
            const booking = bookingById.get(attempt.booking_id);
            return (
              <CollectionFeeReconciliation
                key={attempt.id}
                attemptId={attempt.id}
                bookingId={attempt.booking_id}
                amount={Number(attempt.amount)}
                bookingReference={booking?.booking_reference ?? attempt.booking_id}
                guestName={booking?.guest_name ?? "Guest"}
                receipt={attempt.mpesa_receipt_number}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}