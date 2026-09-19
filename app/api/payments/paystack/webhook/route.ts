import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { verifyPaystackTransaction } from "@/app/lib/paystack";
import { finalizePaystackPayment } from "@/app/lib/paystack-payment";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function POST(request: Request) {
  if (!PAYSTACK_SECRET_KEY) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const expectedSignature = crypto
      .createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: { reference?: string };
    };

    // Paystack recommends webhooks as the primary server-side confirmation
    // mechanism. We only need to fulfill successful charge events here.
    if (event.event !== "charge.success" || !event.data?.reference) {
      return NextResponse.json({ received: true });
    }

    const reference = event.data.reference;
    const transaction = await verifyPaystackTransaction(reference);

    if (transaction.reference !== reference || transaction.status !== "success") {
      return NextResponse.json({ received: true });
    }

    await finalizePaystackPayment(reference, transaction);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
