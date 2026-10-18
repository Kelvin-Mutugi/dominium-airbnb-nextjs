import {
  getFinancialPage,
  getFinancialSourceMatches,
  type FinancialEntry,
  type FinancialTransaction,
} from "@/app/lib/admin-finance";
import {
  FinanceEmptyState,
  FinanceHeading,
  FinancePagination,
  formatFinanceMoney,
  transactionBalanceStatus,
} from "@/components/admin/finance/finance-components";

type SourceMatches = Awaited<ReturnType<typeof getFinancialSourceMatches>>;

function pageNumber(value?: string) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function reconcileTransaction(
  transaction: FinancialTransaction,
  entries: FinancialEntry[],
  matches: SourceMatches,
) {
  const debit = entries.reduce(
    (sum, entry) => sum + Number(entry.debit_amount || 0),
    0,
  );
  const credit = entries.reduce(
    (sum, entry) => sum + Number(entry.credit_amount || 0),
    0,
  );

  const requiresSource = ["payout", "payment", "refund", "reversal"].includes(
    transaction.source_type,
  );
  const sourceAmount =
    transaction.source_type === "payout"
      ? transaction.payout_id
        ? matches.payoutAmounts.get(transaction.payout_id)
        : undefined
      : ["payment", "refund", "reversal"].includes(transaction.source_type)
        ? transaction.payment_id
          ? matches.paymentAmounts.get(transaction.payment_id)
          : undefined
        : undefined;
  const sourceMatch = !requiresSource
    ? "Reference only"
    : sourceAmount === undefined
      ? "Unmatched"
      : "Matched";

  const amountMismatch =
    sourceAmount !== undefined &&
    ((transaction.source_type === "payout" &&
      Math.abs(
        entries
          .filter((entry) => entry.account_code === "2100_HOST_PAYABLES")
        .reduce(
          (sum, entry) =>
            sum +
            Number(
              transaction.event_type === "confirmed_reversal"
                ? entry.credit_amount || 0
                : entry.debit_amount || 0,
            ),
          0,
        ) -
        sourceAmount,
    ) > 0.01) ||
      (transaction.source_type === "payment" &&
        transaction.event_type === "guest_payment_received" &&
        Math.abs(
          entries
            .filter((entry) => entry.account_code === "1100_M_PESA_CLEARING")
            .reduce((sum, entry) => sum + Number(entry.debit_amount || 0), 0) -
            sourceAmount,
        ) > 0.01));
  const balanced = transactionBalanceStatus(entries) === "Balanced";

  return {
    debit,
    credit,
    balanced,
    sourceMatch: amountMismatch ? "Amount mismatch" : sourceMatch,
    discrepancy: !balanced || sourceMatch === "Unmatched" || amountMismatch,
  };
}

export default async function FinancialReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const ledgerPage = await getFinancialPage({ page: pageNumber(params.page) });
  const matches = await getFinancialSourceMatches(ledgerPage.transactions);
  const reconciliationRows = ledgerPage.transactions.map((transaction) => ({
    transaction,
    state: reconcileTransaction(
      transaction,
      ledgerPage.entriesByTransaction.get(transaction.id) ?? [],
      matches,
    ),
  }));
  const discrepancyCount = reconciliationRows.filter(
    ({ state }) => state.discrepancy,
  ).length;

  return (
    <div className="space-y-5">
      <FinanceHeading
        title="Transaction reconciliation"
        description="Match journal postings to payment and payout records, compare collection and settlement amounts, and flag unbalanced or unmatched transactions."
      />
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Discrepancies on this page
        </p>
        <p className="mt-2 text-2xl font-semibold text-[#1B1A2E]">
          {discrepancyCount.toLocaleString()}
        </p>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {reconciliationRows.length === 0 ? (
          <>
            <FinanceEmptyState message="No transactions are available to reconcile." />
            <FinancePagination
              basePath="/admin/financial/reconciliation"
              page={ledgerPage.page}
              totalPages={ledgerPage.totalPages}
            />
          </>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Ledger transaction</th>
                    <th className="px-4 py-3">Source reference</th>
                    <th className="px-4 py-3">Source match</th>
                    <th className="px-4 py-3 text-right">Debits</th>
                    <th className="px-4 py-3 text-right">Credits</th>
                    <th className="px-4 py-3">Journal balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reconciliationRows.map(({ transaction, state }) => {
                    const sourceMismatch =
                      state.sourceMatch === "Unmatched" ||
                      state.sourceMatch === "Amount mismatch";
                    return (
                      <tr key={transaction.id} className="align-top hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="block font-medium text-[#1B1A2E]">
                            {transaction.description || transaction.event_type}
                          </span>
                          <span className="mt-1 block font-mono text-xs text-gray-500">
                            {transaction.id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="block text-gray-700">
                            {transaction.source_type.replaceAll("_", " ")}
                          </span>
                          <span className="mt-1 block font-mono text-xs text-gray-500">
                            {transaction.source_ref}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              sourceMismatch
                                ? "bg-rose-50 text-rose-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {state.sourceMatch}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-rose-700">
                          {formatFinanceMoney(state.debit)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-emerald-700">
                          {formatFinanceMoney(state.credit)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              state.discrepancy
                                ? "bg-amber-50 text-amber-800"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {state.discrepancy ? "Needs review" : "Reconciled"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <FinancePagination
              basePath="/admin/financial/reconciliation"
              page={ledgerPage.page}
              totalPages={ledgerPage.totalPages}
            />
          </>
        )}
      </section>
    </div>
  );
}
