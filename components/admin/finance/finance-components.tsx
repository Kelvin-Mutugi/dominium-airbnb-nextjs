import Link from "next/link";
import type {
  FinancialEntry,
  FinancialPage,
} from "@/app/lib/admin-finance";

export function FinanceHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-[#E23E85]">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
        {description}
      </p>
    </header>
  );
}

export function FinanceMetrics({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
            {item.label}
          </dt>
          <dd className="mt-3 text-2xl font-semibold text-[#1B1A2E]">
            {item.value.toLocaleString()}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function FinanceEmptyState({ message }: { message: string }) {
  return (
    <p className="border-y border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
      {message}
    </p>
  );
}

export function FinancePagination({
  basePath,
  page,
  totalPages,
  query = {},
}: {
  basePath: string;
  page: number;
  totalPages: number;
  query?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(nextPage));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav
      aria-label="Financial records pagination"
      className="flex items-center justify-between gap-4 border-t border-gray-200 px-4 py-3 text-sm"
    >
      <span className="text-gray-600">
        Page {page.toLocaleString()} of {totalPages.toLocaleString()}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={pageHref(page - 1)}
            className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-400">
            Previous
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={pageHref(page + 1)}
            className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-400">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}

function entryTotals(entries: FinancialEntry[]) {
  return entries.reduce(
    (totals, entry) => ({
      debit: totals.debit + Number(entry.debit_amount || 0),
      credit: totals.credit + Number(entry.credit_amount || 0),
    }),
    { debit: 0, credit: 0 },
  );
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Nairobi",
      });
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

export function FinanceTransactionsTable({
  pageData,
  basePath,
  query,
}: {
  pageData: FinancialPage;
  basePath: string;
  query?: Record<string, string | undefined>;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {pageData.transactions.length === 0 ? (
        <>
          <FinanceEmptyState message="No ledger transactions match this view yet." />
          <FinancePagination
            basePath={basePath}
            page={pageData.page}
            totalPages={pageData.totalPages}
            query={query}
          />
        </>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Transaction</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Debits</th>
                  <th className="px-4 py-3 text-right">Credits</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageData.transactions.map((transaction) => {
                  const totals =
                    pageData.entriesByTransaction.get(transaction.id) ?? [];
                  const { debit, credit } = entryTotals(totals);
                  return (
                    <tr key={transaction.id} className="align-top hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatDate(transaction.posted_at ?? transaction.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-medium text-[#1B1A2E]">
                          {transaction.description || humanize(transaction.event_type)}
                        </span>
                        <span className="mt-1 block max-w-64 truncate font-mono text-xs text-gray-500">
                          {transaction.id}
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          {humanize(transaction.event_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="block">{humanize(transaction.source_type)}</span>
                        <span className="mt-1 block max-w-48 truncate font-mono text-xs text-gray-500">
                          {transaction.source_ref}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {formatMoney(debit)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {formatMoney(credit)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                          {humanize(transaction.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <FinancePagination
            basePath={basePath}
            page={pageData.page}
            totalPages={pageData.totalPages}
            query={query}
          />
        </>
      )}
    </section>
  );
}

export function formatFinanceMoney(amount: number) {
  return formatMoney(amount);
}

export function formatFinanceDate(value: string | null) {
  return formatDate(value);
}

export function FinanceEntriesTable({
  pageData,
  basePath,
}: {
  pageData: FinancialPage;
  basePath: string;
}) {
  const lineCount = pageData.entries.length;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {pageData.transactions.length === 0 ? (
        <>
          <FinanceEmptyState message="No journal entries match this view yet." />
          <FinancePagination
            basePath={basePath}
            page={pageData.page}
            totalPages={pageData.totalPages}
          />
        </>
      ) : (
        <>
          <p className="border-b border-gray-200 px-4 py-3 text-sm text-gray-600">
            {pageData.transactions.length.toLocaleString()} transactions ·{" "}
            {lineCount.toLocaleString()} journal lines on this page
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Posted</th>
                  <th className="px-4 py-3">Transaction</th>
                  <th className="px-4 py-3">Account code</th>
                  <th className="px-4 py-3">Source reference</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageData.transactions.flatMap((transaction) => {
                  const entries =
                    pageData.entriesByTransaction.get(transaction.id) ?? [];
                  if (!entries.length) {
                    return [
                      <tr key={`${transaction.id}-missing-entries`}>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {formatDate(transaction.posted_at ?? transaction.created_at)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">
                          {transaction.id}
                        </td>
                        <td colSpan={4} className="px-4 py-3 text-amber-800">
                          No journal lines are linked to this transaction.
                        </td>
                      </tr>,
                    ];
                  }
                  return entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatDate(transaction.posted_at ?? transaction.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-medium text-[#1B1A2E]">
                          {transaction.description || humanize(transaction.event_type)}
                        </span>
                        <span className="mt-1 block font-mono text-xs text-gray-500">
                          {transaction.id}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {entry.account_code}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block text-gray-700">
                          {humanize(transaction.source_type)}
                        </span>
                        <span className="mt-1 block max-w-48 truncate font-mono text-xs text-gray-500">
                          {transaction.source_ref}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-rose-700">
                        {formatMoney(Number(entry.debit_amount || 0))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-emerald-700">
                        {formatMoney(Number(entry.credit_amount || 0))}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
          <FinancePagination
            basePath={basePath}
            page={pageData.page}
            totalPages={pageData.totalPages}
          />
        </>
      )}
    </section>
  );
}

export function transactionBalanceStatus(entries: FinancialEntry[]) {
  const { debit, credit } = entryTotals(entries);
  return Math.abs(debit - credit) <= 0.01 ? "Balanced" : "Out of balance";
}
