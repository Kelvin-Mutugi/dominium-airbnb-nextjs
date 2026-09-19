import { NextResponse } from "next/server";
import { verifyPaystackTransaction } from "@/app/lib/paystack";
import { finalizePaystackPayment } from "@/app/lib/paystack-payment";

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

    return NextResponse.json({
      success: result.paid,
      status: transaction.status,
      bookingId: result.bookingId,
      paymentId: result.paymentId,
      reference,
    });
  } catch (error) {
    console.error("Paystack verification error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to verify payment" },
      { status: 500 },
    );
  }
}
