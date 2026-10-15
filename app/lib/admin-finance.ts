import "server-only";

import { requireAdmin } from "@/app/lib/admin-auth";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

export const FINANCE_PAGE_SIZE = 25;

export type FinancialTransaction = {
  id: string;
  event_type: string;
  source_type: string;
  source_ref: string;
  booking_id: string | null;
  payment_id: string | null;
  payout_id: string | null;
  host_id: string | null;
  currency: string;
  idempotency_key: string;
  description: string;
  metadata: Record<string, unknown>;
  status: string;
  created_at: string;
  posted_at: string | null;
  reversal_of: string | null;
};

export type FinancialEntry = {
  id: string;
  transaction_id: string;
  account_code: string;
  booking_id: string | null;
  payment_id: string | null;
  payout_id: string | null;
  host_id: string | null;
  currency: string;
  debit_amount: number | string;
  credit_amount: number | string;
  created_at: string;
};

export type FinancialPage = {
  transactions: FinancialTransaction[];
  entries: FinancialEntry[];
  entriesByTransaction: Map<string, FinancialEntry[]>;
  total: number;
  page: number;
  totalPages: number;
};

function throwQueryError(message: string, error: unknown): never {
  console.error(message, error);
  throw new Error(message);
}

async function getEntriesForTransactions(
  transactionIds: string[],
): Promise<FinancialEntry[]> {
  if (!transactionIds.length) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("financial_entries")
    .select(
      "id, transaction_id, account_code, booking_id, payment_id, payout_id, host_id, currency, debit_amount, credit_amount, created_at",
    )
    .in("transaction_id", transactionIds)
    .order("created_at", { ascending: true });

  if (error) throwQueryError("Unable to load financial journal entries.", error);
  return (data ?? []) as unknown as FinancialEntry[];
}

export async function getFinancialPage({
  page = 1,
  eventTypes,
  from,
  through,
  bookingId,
}: {
  page?: number;
  eventTypes?: string[];
  from?: string;
  through?: string;
  bookingId?: string;
} = {}): Promise<FinancialPage> {
  await requireAdmin();

  const requestedPage = Math.max(1, Math.floor(page));
  const start = (requestedPage - 1) * FINANCE_PAGE_SIZE;
  const admin = getSupabaseAdmin();
  let query = admin
    .from("financial_transactions")
    .select(
      "id, event_type, source_type, source_ref, booking_id, payment_id, payout_id, host_id, currency, idempotency_key, description, metadata, status, created_at, posted_at, reversal_of",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(start, start + FINANCE_PAGE_SIZE - 1);

  if (eventTypes) query = query.in("event_type", eventTypes);
  if (from) query = query.gte("created_at", from);
  if (through) query = query.lte("created_at", through);
  if (bookingId) query = query.eq("booking_id", bookingId);

  const { data, error, count } = await query;
  if (error) throwQueryError("Unable to load financial transactions.", error);

  const transactions = (data ?? []) as unknown as FinancialTransaction[];
  const entries = await getEntriesForTransactions(
    transactions.map((transaction) => transaction.id),
  );
  const entriesByTransaction = new Map<string, FinancialEntry[]>();
  for (const entry of entries) {
    const transactionEntries = entriesByTransaction.get(entry.transaction_id) ?? [];
    transactionEntries.push(entry);
    entriesByTransaction.set(entry.transaction_id, transactionEntries);
  }

  const total = count ?? 0;
  return {
    transactions,
    entries,
    entriesByTransaction,
    total,
    page: requestedPage,
    totalPages: Math.ceil(total / FINANCE_PAGE_SIZE),
  };
}

export async function getFinancialSummary() {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const [postedResult, entryResult, payoutResult, adjustmentResult] =
    await Promise.all([
      admin
        .from("financial_transactions")
        .select("id", { count: "exact", head: true })
        .eq("status", "posted"),
      admin.from("financial_entries").select("id", { count: "exact", head: true }),
      admin
        .from("financial_transactions")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "host_payout_settled"),
      admin
        .from("financial_transactions")
        .select("id", { count: "exact", head: true })
        .in("event_type", [
          "refund_posted",
          "confirmed_reversal",
          "late_guest_payment_received",
        ]),
    ]);

  if (postedResult.error)
    throwQueryError("Unable to load the posted transaction count.", postedResult.error);
  if (entryResult.error)
    throwQueryError("Unable to load the journal entry count.", entryResult.error);
  if (payoutResult.error)
    throwQueryError("Unable to load the host settlement count.", payoutResult.error);
  if (adjustmentResult.error)
    throwQueryError("Unable to load the refund and reversal count.", adjustmentResult.error);

  return {
    postedTransactions: postedResult.count ?? 0,
    journalEntries: entryResult.count ?? 0,
    hostSettlements: payoutResult.count ?? 0,
    refundsAndReversals: adjustmentResult.count ?? 0,
  };
}

export async function getFinancialSourceMatches(
  transactions: FinancialTransaction[],
): Promise<{
  paymentAmounts: Map<string, number>;
  payoutAmounts: Map<string, number>;
}> {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const paymentIdsToFind = [
    ...new Set(
      transactions
        .filter((transaction) =>
          ["payment", "refund", "reversal"].includes(transaction.source_type),
        )
        .map((transaction) => transaction.payment_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const payoutIdsToFind = [
    ...new Set(
      transactions
        .filter((transaction) => transaction.source_type === "payout")
        .map((transaction) => transaction.payout_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [paymentsResult, payoutsResult] = await Promise.all([
    paymentIdsToFind.length
      ? admin.from("payments").select("id, amount").in("id", paymentIdsToFind)
      : Promise.resolve({ data: [], error: null }),
    payoutIdsToFind.length
      ? admin.from("payouts").select("id, amount").in("id", payoutIdsToFind)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (paymentsResult.error)
    throwQueryError("Unable to match ledger entries to payments.", paymentsResult.error);
  if (payoutsResult.error)
    throwQueryError("Unable to match ledger entries to payouts.", payoutsResult.error);

  return {
    paymentAmounts: new Map(
      (paymentsResult.data ?? []).map((row) => [row.id, Number(row.amount)]),
    ),
    payoutAmounts: new Map(
      (payoutsResult.data ?? []).map((row) => [row.id, Number(row.amount)]),
    ),
  };
}
