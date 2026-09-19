import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { initializePaystackTransaction } from "@/app/lib/paystack";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase server environment variables are not configured");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

type PaymentMethod = "mpesa" | "card";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, paymentMethod } = body as {
      bookingId?: string;
      paymentMethod?: PaymentMethod;
    };

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId is required" },
        { status: 400 },
      );
    }

    if (paymentMethod !== "mpesa" && paymentMethod !== "card") {
      return NextResponse.json(
        { success: false, error: "Invalid payment method" },
        { status: 400 },
      );
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, guest_email, total_amount, status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking lookup error:", bookingError);
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 },
      );
    }

    if (booking.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "This booking is not awaiting payment" },
        { status: 400 },
      );
    }

    if (!booking.guest_email) {
      return NextResponse.json(
        { success: false, error: "Booking does not have a guest email" },
        { status: 400 },
      );
    }

    const bookingAmount = Number(booking.total_amount);

    if (!Number.isFinite(bookingAmount) || bookingAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid booking amount" },
        { status: 400 },
      );
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("id, amount, status, provider, provider_reference")
      .eq("booking_id", booking.id)
      .eq("provider", "paystack")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      console.error("Payment lookup error:", paymentError);
      return NextResponse.json(
        { success: false, error: "Unable to find payment" },
        { status: 500 },
      );
    }

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "No pending payment found for this booking" },
        { status: 404 },
      );
    }

    const paymentAmount = Number(payment.amount);

    if (bookingAmount !== paymentAmount) {
      console.error("Payment amount mismatch:", {
        bookingAmount,
        paymentAmount,
        bookingId: booking.id,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Payment amount does not match booking amount",
        },
        { status: 400 },
      );
    }

    const reference =
      payment.provider_reference || `BNB_${booking.id}_${Date.now()}`;

    const transaction = await initializePaystackTransaction({
      email: booking.guest_email,
      amount: bookingAmount,
      reference,
      paymentMethod,
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/booking/payment/callback`,
    });

    const { error: updatePaymentError } = await supabaseAdmin
      .from("payments")
      .update({
        provider: "paystack",
        provider_reference: transaction.reference,
        authorization_url: transaction.authorization_url,
      })
      .eq("id", payment.id);

    if (updatePaymentError) {
      console.error("Payment update error:", updatePaymentError);
      return NextResponse.json(
        {
          success: false,
          error: "Payment was initialized but could not be saved",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      authorization_url: transaction.authorization_url,
      access_code: transaction.access_code,
      reference: transaction.reference,
    });
  } catch (error) {
    console.error("Paystack initialization error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to initialize payment" },
      { status: 500 },
    );
  }
}
