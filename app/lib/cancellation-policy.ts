export const PLATFORM_CANCELLATION_POLICY =
  "Refund estimates use the Africa/Nairobi calendar date when you submit the cancellation request and the successful payments recorded for your booking: 14 or more days before check-in, 100% of amounts paid; 7–13 days, 50% of amounts paid; fewer than 7 days, no refund. Cancellation requests require admin approval. If approved, an eligible refund is sent to the booking's M-Pesa number and marked complete only after Safaricom confirms the transfer. This platform schedule applies to every listing and takes precedence over conflicting listing cancellation or refund notes. It does not include a cancellation processing fee or travel credit.";

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
