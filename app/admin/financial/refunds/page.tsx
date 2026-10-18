import { getFinancialPage } from "@/app/lib/admin-finance";
import {
  FinanceHeading,
  FinanceTransactionsTable,
} from "@/components/admin/finance/finance-components";

function pageNumber(value?: string) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default async function FinancialRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const refunds = await getFinancialPage({
    page: pageNumber(params.page),
    eventTypes: [
      "refund_posted",
      "confirmed_reversal",
      "late_guest_payment_received",
    ],
  });

  return (
    <div className="space-y-5">
      <FinanceHeading
        title="Refunds, reversals, and late collections"
        description="Posted guest refunds, confirmed reversals, and successful late collections held for refund or reconciliation."
      />
      <p className="text-sm text-gray-600">
        {refunds.total.toLocaleString()} refund or reversal
        {refunds.total === 1 ? "" : "s"} recorded.
      </p>
      <FinanceTransactionsTable
        pageData={refunds}
        basePath="/admin/financial/refunds"
      />
    </div>
  );
}
