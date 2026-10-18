import { requireAdmin } from "@/app/lib/admin-auth";
import { getFinancialPage } from "@/app/lib/admin-finance";
import {
  FinanceEmptyState,
  FinanceEntriesTable,
  FinanceHeading,
} from "@/components/admin/finance/finance-components";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function BookingFinancialDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const [{ bookingId }, query] = await Promise.all([params, searchParams]);

  if (!isUuid(bookingId)) {
    return (
      <div className="space-y-5">
        <FinanceHeading
          title="Booking journal activity"
          description="Ledger transactions associated with a booking."
        />
        <FinanceEmptyState message="This booking reference is invalid." />
      </div>
    );
  }

  const requestedPage = Number(query.page);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const ledgerPage = await getFinancialPage({ bookingId, page });

  return (
    <div className="space-y-5">
      <FinanceHeading
        title="Booking journal activity"
        description={`Ledger transactions associated with booking ${bookingId}.`}
      />
      <FinanceEntriesTable
        pageData={ledgerPage}
        basePath={`/admin/financial/${encodeURIComponent(bookingId)}`}
      />
    </div>
  );
}
