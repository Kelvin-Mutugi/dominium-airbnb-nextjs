import {
  getFinancialPage,
} from "@/app/lib/admin-finance";
import {
  FinanceHeading,
  FinanceEntriesTable,
} from "@/components/admin/finance/finance-components";

function pageNumber(value?: string) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default async function FinancialLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const ledgerPage = await getFinancialPage({ page: pageNumber(params.page) });

  return (
    <div className="space-y-5">
      <FinanceHeading
        title="Journal entries"
        description="Posted and pending double-entry transactions recorded in the financial ledger."
      />
      <p className="text-sm text-gray-600">
        {ledgerPage.total.toLocaleString()} ledger transaction
        {ledgerPage.total === 1 ? "" : "s"}.
      </p>
      <FinanceEntriesTable pageData={ledgerPage} basePath="/admin/financial/ledger" />
    </div>
  );
}
