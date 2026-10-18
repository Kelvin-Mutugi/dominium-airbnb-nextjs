import { CHART_OF_ACCOUNTS } from "@/app/lib/financial-ledger";
import { getFinancialPage } from "@/app/lib/admin-finance";
import {
  FinanceEmptyState,
  FinanceHeading,
  FinancePagination,
  FinanceTransactionsTable,
  formatFinanceMoney,
} from "@/components/admin/finance/finance-components";

function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}

function pageNumber(value?: string) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default async function FinancialReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const from = validDate(params.from);
  const to = validDate(params.to);
  const dateRangeError =
    Boolean(params.from && !from) ||
    Boolean(params.to && !to) ||
    Boolean(from && to && from > to);

  const reportPage = await getFinancialPage({
    page: pageNumber(params.page),
    from: !dateRangeError && from ? `${from}T00:00:00.000Z` : undefined,
    through: !dateRangeError && to ? `${to}T23:59:59.999Z` : undefined,
  });
  const accountTotals = new Map<
    string,
    { debit: number; credit: number }
  >();
  for (const entry of reportPage.entries) {
    const totals = accountTotals.get(entry.account_code) ?? {
      debit: 0,
      credit: 0,
    };
    totals.debit += Number(entry.debit_amount || 0);
    totals.credit += Number(entry.credit_amount || 0);
    accountTotals.set(entry.account_code, totals);
  }
  const accountNames = new Map<string, string>(
    CHART_OF_ACCOUNTS.map((account) => [account.code, account.name]),
  );

  return (
    <div className="space-y-5">
      <FinanceHeading
        title="Financial reports"
        description="Review journal activity by account and filter transaction reports by posting date."
      />

      <form
        action="/admin/financial/reports"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4"
      >
        <label className="grid gap-1 text-sm text-gray-700">
          From
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm text-gray-700">
          Through
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Apply dates
        </button>
      </form>

      {dateRangeError ? (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Use valid dates in YYYY-MM-DD format, with the start date on or before the end date. No date filter was applied.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="font-semibold text-[#1B1A2E]">
            Account activity on this page
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Totals below cover the visible transaction page; use pagination to review the rest of the selected date range.
          </p>
        </div>
        {accountTotals.size === 0 ? (
          <FinanceEmptyState message="There is no account activity in this report page." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3 text-right">Debits</th>
                  <th className="px-4 py-3 text-right">Credits</th>
                  <th className="px-4 py-3 text-right">Net (credit less debit)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...accountTotals.entries()].map(([code, totals]) => {
                  const net = totals.credit - totals.debit;
                  return (
                    <tr key={code}>
                      <td className="px-4 py-3">
                        <span className="block font-medium text-[#1B1A2E]">
                          {accountNames.get(code) ?? code}
                        </span>
                        <span className="mt-1 block font-mono text-xs text-gray-500">
                          {code}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-rose-700">
                        {formatFinanceMoney(totals.debit)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-emerald-700">
                        {formatFinanceMoney(totals.credit)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                          net > 0
                            ? "text-emerald-700"
                            : net < 0
                              ? "text-rose-700"
                              : "text-gray-600"
                        }`}
                      >
                        {formatFinanceMoney(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <FinancePagination
          basePath="/admin/financial/reports"
          page={reportPage.page}
          totalPages={reportPage.totalPages}
          query={{ from, to }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1B1A2E]">
          Transactions included
        </h2>
        <FinanceTransactionsTable
          pageData={reportPage}
          basePath="/admin/financial/reports"
          query={{ from, to }}
        />
      </section>
    </div>
  );
}
