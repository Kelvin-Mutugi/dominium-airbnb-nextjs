export const REFUND_PROCESSING_TIMELINE =
  "Approved refunds are returned through the original payment method (currently M-Pesa). Allow 5–14 business days after processing for the funds to appear; timing depends on the bank or payment provider.";

export const PLATFORM_CANCELLATION_POLICY_ITEMS = [
  "14 days or more before check-in: 100% refund of amounts paid, less any separately disclosed non-refundable transaction or processing charges where applicable.",
  "7–13 days before check-in: 50% refund of amounts paid, less any separately disclosed non-refundable transaction or processing charges where applicable.",
  "Less than 7 days before check-in: no refund.",
  "No-shows: guests who do not arrive on the scheduled check-in date without prior notice forfeit 100% of the booking amount.",
  "Early departures: no refund is granted for shortened stays or unused nights after check-in.",
  "Host or Dominium BNB cancellations: guests receive a 100% refund of all amounts paid for the affected booking. Dominium BNB will make reasonable efforts to help find alternative accommodation where available.",
  "Exceptional circumstances, including natural disasters, government travel restrictions, or security concerns, may be reviewed case by case. Contact support with the booking reference and details.",
  REFUND_PROCESSING_TIMELINE,
  "By confirming a reservation, guests acknowledge that they have read, understood, and agreed to this cancellation and refund policy.",
] as const;

export const PLATFORM_CANCELLATION_POLICY = PLATFORM_CANCELLATION_POLICY_ITEMS.join(" ");

export function getCancellationRefundPercent(daysUntilCheckIn: number): number {
  if (!Number.isInteger(daysUntilCheckIn)) {
    throw new Error("Days until check-in must be an integer.");
  }
  if (daysUntilCheckIn >= 14) return 100;
  if (daysUntilCheckIn >= 7) return 50;
  return 0;
}

export function calculateCancellationRefund(
  paidAmount: number,
  daysUntilCheckIn: number,
) {
  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    throw new Error("Paid amount must be a non-negative number.");
  }

  const refundPercent = getCancellationRefundPercent(daysUntilCheckIn);
  return {
    refundPercent,
    estimatedRefund:
      Math.round(paidAmount * (refundPercent / 100) * 100) / 100,
  };
}
