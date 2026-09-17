export type PaymentMethod = "mpesa" | "card";

export interface PaymentRequest {
  method: PaymentMethod;
  amount: number;
  bookingId: string;
  phone?: string;
}

export interface PaymentResult {
  providerReference: string;
}

/**
 * Development payment adapter. Replace this implementation with the real
 * M-Pesa or card provider without changing the booking route contract.
 */
export async function initiatePayment(
  request: PaymentRequest,
): Promise<PaymentResult> {
  return {
    providerReference: `stub_${request.method}_${request.bookingId}`,
  };
}
