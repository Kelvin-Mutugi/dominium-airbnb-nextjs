import { NextResponse } from "next/server";
import { verifyPaystackTransaction } from "@/app/lib/paystack";
import { finalizePaystackPayment } from "@/app/lib/paystack-payment";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reference = String(body?.reference ?? "").trim();

    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Payment reference is required" },
        { status: 400 },
      );
    }

    const transaction = await verifyPaystackTransaction(reference);

    if (transaction.reference !== reference) {
      return NextResponse.json(
        { success: false, error: "Payment reference mismatch" },
        { status: 400 },
      );
    }

    const result = await finalizePaystackPayment(reference, transaction);
    let receipt = null;

    if (result.paid) {
      const admin = getSupabaseAdmin();
      const [{ data: booking, error: bookingError }, { data: payment, error: paymentError }] = await Promise.all([
        admin
          .from("bookings")
          .select("id, check_in, check_out, total_amount, commission_amount, host_payout_amount, listing:listings(title)")
          .eq("id", result.bookingId)
          .maybeSingle(),
        admin
          .from("payments")
          .select("amount, currency, method, payment_channel, provider_reference, paid_at, paystack_transaction_id")
          .eq("id", result.paymentId)
          .maybeSingle(),
      ]);

      if (bookingError || paymentError) {
        return NextResponse.json(
          { success: false, error: "Payment was confirmed, but we couldn't prepare your receipt." },
          { status: 500 },
        );
      }

      if (booking && payment) {
        const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;
        receipt = {
          bookingId: booking.id,
          listingTitle: listing?.title ?? "Stay",
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          subtotal: Number(booking.host_payout_amount),
          serviceFee: Number(booking.commission_amount),
          tax: 0,
          total: Number(booking.total_amount),
          amountPaid: Number(payment.amount),
          currency: payment.currency ?? "KES",
          paymentMethod: payment.payment_channel ?? payment.method ?? String(transaction.channel ?? "Paystack"),
          paymentReference: payment.provider_reference,
          transactionId: payment.paystack_transaction_id,
          paidAt: payment.paid_at,
        };
      }
    }

    return NextResponse.json({
      success: result.paid,
      status: transaction.status,
      bookingId: result.bookingId,
      paymentId: result.paymentId,
      reference,
      receipt,
    });
  } catch (error) {
    console.error("Paystack verification error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to verify payment" },
      { status: 500 },
    );
  }
}
