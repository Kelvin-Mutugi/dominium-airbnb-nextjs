import { getFinancialPage } from "@/app/lib/admin-finance";
import {
  FinanceHeading,
  FinanceTransactionsTable,
} from "@/components/admin/finance/finance-components";

function pageNumber(value?: string) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default async function FinancialSettlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const settlements = await getFinancialPage({
    page: pageNumber(params.page),
    eventTypes: ["host_payout_settled"],
  });

  return (
    <div className="space-y-5">
      <FinanceHeading
        title="Host settlements"
        description="Ledger postings for host payout settlements, including the linked payout reference and recorded debit and credit amounts."
      />
      <p className="text-sm text-gray-600">
        {settlements.total.toLocaleString()} settlement
        {settlements.total === 1 ? "" : "s"} recorded.
      </p>
      <FinanceTransactionsTable
        pageData={settlements}
        basePath="/admin/financial/payouts"
      />
    </div>
  );
}
