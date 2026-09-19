import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase server environment variables are not configured");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function finalizePaystackPayment(
  reference: string,
  transaction: Record<string, unknown>,
) {
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payments")
    .select("id, booking_id, amount, status, provider, provider_reference")
    .eq("provider", "paystack")
    .eq("provider_reference", reference)
    .maybeSingle();

  if (paymentError) throw paymentError;
  if (!payment) throw new Error("Payment record not found");

  const expectedAmount = Math.round(Number(payment.amount) * 100);
  const receivedAmount = Number(transaction.amount);
  const currency = String(transaction.currency ?? "");

  if (currency !== "KES") {
    throw new Error("Unexpected payment currency");
  }

  if (!Number.isFinite(receivedAmount) || receivedAmount !== expectedAmount) {
    throw new Error("Paystack amount does not match the booking amount");
  }

  if (String(transaction.status) !== "success") {
    return {
      paid: false,
      paymentId: payment.id,
      bookingId: payment.booking_id,
    };
  }

  const { error: updatePaymentError } = await supabaseAdmin
    .from("payments")
    .update({
      status: "paid",
      method:
        transaction.channel === "card"
          ? "card"
          : transaction.channel === "mobile_money"
            ? "mpesa"
            : null,
      paid_at: transaction.paid_at ?? new Date().toISOString(),
      paystack_transaction_id: Number.isFinite(Number(transaction.id))
        ? Number(transaction.id)
        : null,
      payment_channel: transaction.channel ?? null,
      raw_response: transaction,
    })
    .eq("id", payment.id)
    .eq("status", "pending");

  if (updatePaymentError) throw updatePaymentError;

  const { error: bookingError } = await supabaseAdmin
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", payment.booking_id)
    .eq("status", "pending");

  if (bookingError) throw bookingError;

  return { paid: true, paymentId: payment.id, bookingId: payment.booking_id };
}
