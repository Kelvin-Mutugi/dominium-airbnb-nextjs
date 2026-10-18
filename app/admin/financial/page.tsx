import Link from "next/link";
import {
  getFinancialPage,
  getFinancialSummary,
} from "@/app/lib/admin-finance";
import {
  FinanceHeading,
  FinanceMetrics,
  FinanceTransactionsTable,
} from "@/components/admin/finance/finance-components";

function pageNumber(value?: string) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default async function AdminFinancialDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const [summary, recentTransactions] = await Promise.all([
    getFinancialSummary(),
    getFinancialPage({ page: pageNumber(params.page) }),
  ]);

  return (
    <div className="space-y-7">
      <FinanceHeading
        title="Finance overview"
        description="A live overview of posted journal activity, host settlements, refunds, and reversals."
      />

      <FinanceMetrics
        items={[
          { label: "Posted transactions", value: summary.postedTransactions },
          { label: "Journal entries", value: summary.journalEntries },
          { label: "Host settlements", value: summary.hostSettlements },
          { label: "Refunds, reversals & late collections", value: summary.refundsAndReversals },
        ]}
      />

      <section className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-gray-200 bg-white p-4 text-sm">
        <Link href="/admin/financial/ledger" className="font-medium text-[#CF2F74] hover:underline">
          Journal entries
        </Link>
        <Link href="/admin/financial/payouts" className="font-medium text-[#CF2F74] hover:underline">
          Host settlements
        </Link>
        <Link href="/admin/financial/refunds" className="font-medium text-[#CF2F74] hover:underline">
          Refunds, reversals, and late collections
        </Link>
        <Link href="/admin/financial/reconciliation" className="font-medium text-[#CF2F74] hover:underline">
          Reconciliation
        </Link>
        <Link href="/admin/financial/reports" className="font-medium text-[#CF2F74] hover:underline">
          Reports
        </Link>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#1B1A2E]">Recent ledger activity</h2>
            <p className="mt-1 text-sm text-gray-600">
              {recentTransactions.total.toLocaleString()} transaction
              {recentTransactions.total === 1 ? "" : "s"} recorded.
            </p>
          </div>
          <Link href="/admin/financial/ledger" className="text-sm font-medium text-[#CF2F74] hover:underline">
            View journal
          </Link>
        </div>
        <FinanceTransactionsTable
          pageData={recentTransactions}
          basePath="/admin/financial"
        />
      </section>
    </div>
  );
}
