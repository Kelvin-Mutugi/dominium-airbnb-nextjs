const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not configured");
}

const PAYSTACK_API_URL = "https://api.paystack.co";

type PaymentMethod = "mpesa" | "card";

export async function initializePaystackTransaction({
  email,
  amount,
  reference,
  callbackUrl,
  paymentMethod,
}: {
  email: string;
  amount: number;
  reference: string;
  callbackUrl?: string;
  paymentMethod?: PaymentMethod;
}) {
  const channels =
    paymentMethod === "card"
      ? ["card"]
      : paymentMethod === "mpesa"
        ? ["mobile_money"]
        : undefined;

  const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: Math.round(amount * 100),
      currency: "KES",
      reference,
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      ...(channels ? { channels } : {}),
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    throw new Error(
      data.message || "Failed to initialize Paystack transaction",
    );
  }

  return data.data;
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(
    `${PAYSTACK_API_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
      cache: "no-store",
    },
  );

  const data = await response.json();

  if (!response.ok || !data.status) {
    throw new Error(data.message || "Failed to verify Paystack transaction");
  }

  return data.data;
}
