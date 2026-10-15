export type LedgerCurrency = "KES";
export type LedgerStatus = "draft" | "posted" | "reversed" | "rejected";

export const CHART_OF_ACCOUNTS = [
  {
    code: "1100_M_PESA_CLEARING",
    name: "M-PESA clearing and cash held",
    type: "asset",
    description:
      "Cash collected from guest payments but not yet settled to the operating account or transferred to hosts.",
  },
  {
    code: "1200_SETTLEMENT_ACCOUNT",
    name: "Operating settlement account",
    type: "asset",
    description: "Bank or settlement account holding cleared funds to be used for host payouts.",
  },
  {
    code: "2100_HOST_PAYABLES",
    name: "Host payable liabilities",
    type: "liability",
    description:
      "Amounts owed to hosts once their accommodation service is complete and the payout is approved.",
  },
  {
    code: "2200_DEFERRED_PLATFORM_REVENUE",
    name: "Deferred platform revenue",
    type: "liability",
    description:
      "Platform markup deferred until the stay is substantially complete or cancellation terms are settled.",
  },
  {
    code: "3100_GUEST_REFUND_PAYABLE",
    name: "Guest refund payable",
    type: "liability",
    description:
      "Outstanding liability created when a guest is entitled to a refund or a reversal is acknowledged.",
  },
  {
    code: "4100_PAYMENT_PROCESSING_EXPENSE",
    name: "Payment processing expense",
    type: "expense",
    description:
      "Fees charged by M-PESA or card processors for payment collection and settlement.",
  },
  {
    code: "5000_PLATFORM_REVENUE",
    name: "Recognized platform revenue",
    type: "revenue",
    description:
      "Platform revenue recognized when the booking is fulfilled or the applicable refund/cancellation policy is settled.",
  },
  {
    code: "5200_REFUND_AND_DISPUTE_LOSS",
    name: "Refunds and unrecoverable losses",
    type: "expense",
    description:
      "Losses created by refunds, disputes, customer-initiated reversals, or unrecoverable failed transactions.",
  },
  {
    code: "6100_HOST_PAYOUT_LIABILITIES",
    name: "Host payout disbursement liabilities",
    type: "liability",
    description:
      "Provider-side disbursement requests created for host withdrawals before the actual B2C result is confirmed.",
  },
  {
    code: "7000_TAX_LIABILITY",
    name: "Tax liability",
    type: "liability",
    description:
      "Tax collected or due when required by local tax law and after accounting review by a qualified accountant.",
  },
] as const;

export const ACCOUNT_CODES: string[] = CHART_OF_ACCOUNTS.map((account) => account.code);

export interface LedgerEntryInput {
  accountCode: string;
  debit?: number | string;
  credit?: number | string;
  bookingId?: string;
  paymentId?: string;
  payoutId?: string;
  hostId?: string;
}

export interface LedgerTransactionInput {
  eventType: string;
  sourceType: string;
  sourceRef: string;
  bookingId?: string;
  paymentId?: string;
  payoutId?: string;
  hostId?: string;
  idempotencyKey: string;
  description: string;
  metadata?: Record<string, unknown>;
  currency?: LedgerCurrency;
  entries: LedgerEntryInput[];
}

export interface LedgerTransaction {
  id: string;
  eventType: string;
  sourceType: string;
  sourceRef: string;
  bookingId?: string;
  paymentId?: string;
  payoutId?: string;
  hostId?: string;
  idempotencyKey: string;
  description: string;
  metadata: Record<string, unknown>;
  currency: LedgerCurrency;
  status: LedgerStatus;
  createdAt: string;
  postedAt: string;
  entries: LedgerEntryInput[];
}

export function money(value: number | string | null | undefined): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

export function normalizeEntry(entry: LedgerEntryInput): LedgerEntryInput {
  const debit = money(entry.debit ?? 0);
  const credit = money(entry.credit ?? 0);

  if (!ACCOUNT_CODES.includes(entry.accountCode)) {
    throw new Error(`Unsupported account code: ${entry.accountCode}`);
  }

  if (debit > 0 && credit > 0) {
    throw new Error(`Entry for ${entry.accountCode} cannot have both debit and credit.`);
  }

  return {
    ...entry,
    debit: debit > 0 ? debit : 0,
    credit: credit > 0 ? credit : 0,
  };
}

export function validateBalancedEntries(entries: LedgerEntryInput[]): LedgerEntryInput[] {
  if (!entries.length) {
    throw new Error("Journal must contain at least one entry.");
  }

  const normalized = entries.map(normalizeEntry);
  const debitTotal = normalized.reduce<number>((sum, entry) => sum + Number(entry.debit ?? 0), 0);
  const creditTotal = normalized.reduce<number>((sum, entry) => sum + Number(entry.credit ?? 0), 0);

  if (Math.abs(money(debitTotal - creditTotal)) > 0.01) {
    throw new Error("Journal entries do not balance.");
  }

  return normalized;
}

export function makeLedgerId(): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `ledger-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createBalancedJournalTransaction(
  input: LedgerTransactionInput,
): LedgerTransaction {
  const now = new Date().toISOString();
  const entries = validateBalancedEntries(input.entries);

  if (!input.idempotencyKey || !input.idempotencyKey.trim()) {
    throw new Error("Ledger idempotency key is required.");
  }

  return {
    id: makeLedgerId(),
    eventType: input.eventType,
    sourceType: input.sourceType,
    sourceRef: input.sourceRef,
    bookingId: input.bookingId,
    paymentId: input.paymentId,
    payoutId: input.payoutId,
    hostId: input.hostId,
    idempotencyKey: input.idempotencyKey,
    description: input.description,
    metadata: input.metadata ?? {},
    currency: input.currency ?? "KES",
    status: "posted",
    createdAt: now,
    postedAt: now,
    entries,
  };
}

export function buildGuestCollectionPosting({
  guestTotal,
  hostAmount,
  platformMarkup,
  processingFee = 0,
  bookingId,
  paymentId,
  idempotencyKey,
  description = "Guest collection posted",
  metadata = {},
}: {
  guestTotal: number | string;
  hostAmount: number | string;
  platformMarkup: number | string;
  processingFee?: number | string;
  bookingId?: string;
  paymentId?: string;
  idempotencyKey: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): LedgerTransaction {
  const guest = money(guestTotal);
  const host = money(hostAmount);
  const markup = money(platformMarkup);
  const fee = money(processingFee);

  const entries: LedgerEntryInput[] = [
    { accountCode: "1100_M_PESA_CLEARING", debit: guest },
    { accountCode: "2100_HOST_PAYABLES", credit: host },
    { accountCode: "2200_DEFERRED_PLATFORM_REVENUE", credit: markup },
  ];

  if (fee > 0) {
    entries.push(
      { accountCode: "4100_PAYMENT_PROCESSING_EXPENSE", debit: fee },
      { accountCode: "1100_M_PESA_CLEARING", credit: fee },
    );
  }

  return createBalancedJournalTransaction({
    eventType: "guest_payment_received",
    sourceType: "payment",
    sourceRef: paymentId ?? `payment-${idempotencyKey}`,
    bookingId,
    paymentId,
    idempotencyKey,
    description,
    metadata,
    entries,
  });
}

export function buildRefundPosting({
  refundAmount,
  bookingId,
  paymentId,
  idempotencyKey,
  description = "Cancellation refund posted",
  metadata = {},
}: {
  refundAmount: number | string;
  bookingId?: string;
  paymentId?: string;
  idempotencyKey: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): LedgerTransaction {
  const refund = money(refundAmount);
  const entries: LedgerEntryInput[] = [
    { accountCode: "3100_GUEST_REFUND_PAYABLE", debit: refund },
    { accountCode: "1100_M_PESA_CLEARING", credit: refund },
  ];

  return createBalancedJournalTransaction({
    eventType: "refund_posted",
    sourceType: "refund",
    sourceRef: paymentId ?? `refund-${idempotencyKey}`,
    bookingId,
    paymentId,
    idempotencyKey,
    description,
    metadata,
    entries,
  });
}

export function buildHostPayoutPosting({
  payoutAmount,
  processingFee = 0,
  bookingId,
  payoutId,
  idempotencyKey,
  description = "Host payout posted",
  metadata = {},
}: {
  payoutAmount: number | string;
  processingFee?: number | string;
  bookingId?: string;
  payoutId?: string;
  idempotencyKey: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): LedgerTransaction {
  const payout = money(payoutAmount);
  const fee = money(processingFee);

  const entries: LedgerEntryInput[] = [
    { accountCode: "2100_HOST_PAYABLES", debit: payout },
    { accountCode: "6100_HOST_PAYOUT_LIABILITIES", credit: payout },
  ];

  if (fee > 0) {
    entries.push(
      { accountCode: "4100_PAYMENT_PROCESSING_EXPENSE", debit: fee },
      { accountCode: "1200_SETTLEMENT_ACCOUNT", credit: fee },
    );
  }

  return createBalancedJournalTransaction({
    eventType: "host_payout_settled",
    sourceType: "payout",
    sourceRef: payoutId ?? `payout-${idempotencyKey}`,
    bookingId,
    payoutId,
    idempotencyKey,
    description,
    metadata,
    entries,
  });
}

export function buildReversalPosting({
  reversalAmount,
  bookingId,
  paymentId,
  idempotencyKey,
  description = "Confirmed guest reversal",
  metadata = {},
}: {
  reversalAmount: number | string;
  bookingId?: string;
  paymentId?: string;
  idempotencyKey: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): LedgerTransaction {
  const reversal = money(reversalAmount);

  return createBalancedJournalTransaction({
    eventType: "confirmed_reversal",
    sourceType: "reversal",
    sourceRef: paymentId ?? `reversal-${idempotencyKey}`,
    bookingId,
    paymentId,
    idempotencyKey,
    description,
    metadata,
    entries: [
      { accountCode: "5200_REFUND_AND_DISPUTE_LOSS", debit: reversal },
      { accountCode: "1100_M_PESA_CLEARING", credit: reversal },
    ],
  });
}

export function buildBookingFinancialSnapshot({
  guestTotal,
  hostEarnings,
  platformMarkup,
  discountTotal = 0,
  paymentProcessingFee = 0,
  taxTotal = 0,
  amountRefunded = 0,
  hostAmountPayable = 0,
  actualHostPaid = 0,
}: {
  guestTotal: number | string;
  hostEarnings: number | string;
  platformMarkup: number | string;
  discountTotal?: number | string;
  paymentProcessingFee?: number | string;
  taxTotal?: number | string;
  amountRefunded?: number | string;
  hostAmountPayable?: number | string;
  actualHostPaid?: number | string;
}): Record<string, number> {
  return {
    guest_total: money(guestTotal),
    host_earnings: money(hostEarnings),
    platform_markup: money(platformMarkup),
    discount_total: money(discountTotal),
    payment_processing_fee: money(paymentProcessingFee),
    tax_total: money(taxTotal),
    amount_refunded: money(amountRefunded),
    host_amount_payable: money(hostAmountPayable),
    actual_host_paid: money(actualHostPaid),
  };
}

export function dedupeEvents<T extends { sourceType: string; sourceRef: string; idempotencyKey: string }>(
  events: T[],
): T[] {
  const seen = new Set<string>();

  return events.filter((event) => {
    const key = `${event.sourceType}:${event.sourceRef}:${event.idempotencyKey}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function canIssueRefund({
  refundableBalance,
  alreadyRefunded,
  requestedAmount,
}: {
  refundableBalance: number | string;
  alreadyRefunded: number | string;
  requestedAmount: number | string;
}): boolean {
  const balance = money(refundableBalance);
  const refunded = money(alreadyRefunded);
  const request = money(requestedAmount);
  return request <= Math.max(0, balance - refunded);
}

export function isSuccessfulCollectionCallback({
  resultCode,
  amount,
  expectedAmount,
  receiptNumber,
}: {
  resultCode: string | number;
  amount?: number | string;
  expectedAmount?: number | string;
  receiptNumber?: string | null;
}): boolean {
  const code = String(resultCode);
  const expected = money(expectedAmount ?? amount ?? 0);
  const actual = money(amount ?? 0);
  return (
    code === "0" &&
    Boolean(receiptNumber && receiptNumber.trim()) &&
    actual > 0 &&
    (expected === 0 || actual === expected)
  );
}

export function isSuccessfulRefundResult({
  resultCode,
  amount,
}: {
  resultCode: string | number;
  amount?: number | string;
}): boolean {
  const code = String(resultCode);
  const actual = money(amount ?? 0);
  return code === "0" && actual > 0;
}

export function getReversalState({
  state,
  confirmed,
}: {
  state?: string;
  confirmed?: boolean;
}): "requested" | "pending" | "confirmed" | "rejected" {
  if (confirmed === true) return "confirmed";
  if (state === "rejected") return "rejected";
  if (state === "pending") return "pending";
  return "requested";
}

export function isPayoutEligible({
  checkoutCompletedAt,
  now,
  hostPayoutStatus,
  amountOutstanding,
}: {
  checkoutCompletedAt: string | Date;
  now: string | Date;
  hostPayoutStatus?: string;
  amountOutstanding?: number | string;
}): boolean {
  const checkoutTime = new Date(checkoutCompletedAt).getTime();
  const currentTime = new Date(now).getTime();
  const eligibleAfterMs = 24 * 60 * 60 * 1000;

  if (hostPayoutStatus && hostPayoutStatus !== "pending") {
    return false;
  }

  if (Number(amountOutstanding ?? 0) <= 0) {
    return false;
  }

  return currentTime - checkoutTime >= eligibleAfterMs;
}

export function canProcessPayoutJob({
  hasExistingPayout,
  payoutStatus,
  isAmbiguous,
}: {
  hasExistingPayout: boolean;
  payoutStatus?: string;
  isAmbiguous?: boolean;
}): boolean {
  if (hasExistingPayout && payoutStatus !== "failed") {
    return false;
  }
  if (isAmbiguous) {
    return false;
  }
  return true;
}

export function isPayoutAmbiguous({
  status,
  resultCode,
}: {
  status?: string;
  resultCode?: string | number;
}): boolean {
  const normalizedStatus = (status ?? "").toLowerCase();
  const code = String(resultCode ?? "");
  return normalizedStatus === "pending" || normalizedStatus === "processing" || code === "ambiguous";
}

export function canViewFinancialRecord({
  actorRole,
  requiredRole,
}: {
  actorRole?: string | null;
  requiredRole?: string;
}): boolean {
  if (!requiredRole) return true;
  if (!actorRole) return false;
  return actorRole === requiredRole || actorRole === "admin";
}

export function isPostedRecord(record: { status?: string }): boolean {
  return (record.status ?? "").toLowerCase() === "posted";
}

export function ensureReconciliationSafe({
  previousReconciledAt,
  currentEventId,
  seenEvents,
}: {
  previousReconciledAt?: string | null;
  currentEventId?: string;
  seenEvents?: Set<string>;
}): boolean {
  if (!currentEventId) return false;
  if (!seenEvents) return true;
  if (previousReconciledAt && seenEvents.has(currentEventId)) {
    return false;
  }
  return true;
}

export function createBookingPriceSnapshot({
  guestTotal,
  hostEarnings,
  platformMarkup,
  additionalFees = 0,
  paymentProcessingFee = 0,
}: {
  guestTotal: number | string;
  hostEarnings: number | string;
  platformMarkup: number | string;
  additionalFees?: number | string;
  paymentProcessingFee?: number | string;
}): Record<string, number> {
  return buildBookingFinancialSnapshot({
    guestTotal,
    hostEarnings,
    platformMarkup,
    discountTotal: 0,
    paymentProcessingFee,
    taxTotal: 0,
    amountRefunded: 0,
    hostAmountPayable: money(Number(hostEarnings) + Number(additionalFees)),
    actualHostPaid: 0,
  });
}
