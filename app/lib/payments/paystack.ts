import "server-only";

const API_URL = "https://api.paystack.co";

export type BookingPaymentMethod = "mpesa" | "card";

export interface InitializedPaystackTransaction {
  reference: string;
  access_code: string;
  authorization_url: string;
}

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

export function isValidPaystackReference(reference: string): boolean {
  return /^[A-Za-z0-9-]{1,100}$/.test(reference);
}

export async function initializePaystackTransaction(input: {
  email: string;
  amountKes: number;
  reference: string;
  bookingId: string;
  paymentMethod: BookingPaymentMethod;
  callbackUrl: string;
}): Promise<InitializedPaystackTransaction> {
  if (!isValidPaystackReference(input.reference)) {
    throw new Error("Invalid Paystack reference");
  }
  if (!Number.isFinite(input.amountKes) || input.amountKes <= 0) {
    throw new Error("Invalid payment amount");
  }

  const response = await fetch(`${API_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountKes * 100),
      currency: "KES",
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: input.paymentMethod === "mpesa" ? ["mobile_money"] : ["card"],
      metadata: { booking_id: input.bookingId },
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: Partial<InitializedPaystackTransaction>;
  };

  if (
    !response.ok ||
    !payload.status ||
    !payload.data?.reference ||
    !payload.data.access_code ||
    !payload.data.authorization_url
  ) {
    throw new Error(payload.message ?? "Could not initialize Paystack payment");
  }

  return payload.data as InitializedPaystackTransaction;
}

export async function verifyPaystackTransaction(reference: string) {
  if (!isValidPaystackReference(reference)) throw new Error("Invalid Paystack reference");
  const response = await fetch(
    `${API_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${getSecretKey()}` },
      cache: "no-store",
    },
  );
  const payload = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  };
  if (!response.ok || !payload.status || !payload.data) {
    throw new Error(payload.message ?? "Could not verify Paystack payment");
  }
  return payload.data;
}