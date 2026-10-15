import Link from "next/link";
import { requireAdmin } from "@/app/lib/admin-auth";
import { CHART_OF_ACCOUNTS } from "@/app/lib/financial-ledger";

const sections = [
  { id: "start-here", label: "Start here" },
  { id: "choose-the-right-page", label: "Choose the right page" },
  { id: "money-flow", label: "How money moves" },
  { id: "journal-basics", label: "Journal basics" },
  { id: "accounts", label: "Account reference" },
  { id: "common-tasks", label: "Common tasks" },
  { id: "statuses-and-matching", label: "Statuses & matching" },
  { id: "when-stuck", label: "When something looks wrong" },
  { id: "safe-handling", label: "Safe handling" },
];

function GuideSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <h2 className="border-b border-gray-200 pb-2 text-xl font-semibold text-[#1B1A2E]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-[#1B1A2E]">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-gray-600">{children}</div>
    </article>
  );
}

function GuideLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="font-medium text-[#CF2F74] hover:underline">
      {children}
    </Link>
  );
}

export default async function FinancialDocumentationPage() {
  await requireAdmin();

  return (
    <article className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#CF2F74]">
          Admin reference guide
        </p>
        <h1 className="text-3xl font-semibold text-[#1B1A2E]">
          Finance documentation
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-gray-600">
          A practical guide to the Finance pages: where to go, what the records
          mean, how the booking-to-payout flow works, and what to check when
          something does not match. This guide explains the screens; it does
          not replace your organization&apos;s finance policy or Safaricom&apos;s
          official transaction records.
        </p>
      </header>

      <nav
        aria-label="Finance guide contents"
        className="rounded-xl border border-gray-200 bg-white p-5"
      >
        <h2 className="font-semibold text-[#1B1A2E]">On this page</h2>
        <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-[#CF2F74] hover:underline"
              >
                {index + 1}. {section.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <GuideSection id="start-here" title="1. Start here">
        <div className="grid gap-3 md:grid-cols-2">
          <InfoCard title="Need to take action on a guest payment?">
            Open <GuideLink href="/admin/payouts?view=payments">Guest Payments</GuideLink>.
            It shows operational payment records and is the place to inspect
            payment status or start an eligible refund request.
          </InfoCard>
          <InfoCard title="Need to handle a host withdrawal?">
            Open <GuideLink href="/admin/payouts/requests">Host Payout Requests</GuideLink>.
            Review the request and destination there. A payout is not complete
            just because a request exists; wait for the provider result.
          </InfoCard>
          <InfoCard title="Need to approve or review a refund?">
            Open <GuideLink href="/admin/refunds">Refund Requests</GuideLink>.
            This is the operational workflow for refund decisions and
            processing status.
          </InfoCard>
          <InfoCard title="Need to inspect what was recorded in the books?">
            Use the <GuideLink href="/admin/financial/ledger">Journal Entries</GuideLink>,
            <GuideLink href="/admin/financial/reconciliation"> Reconciliation</GuideLink>,
            or <GuideLink href="/admin/financial/reports"> Reports</GuideLink>.
            These pages are read-only views of financial journal records.
          </InfoCard>
        </div>
        <p className="rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          Important distinction: the operational payment, payout, and refund
          screens show workflow/provider records. The Finance Journal shows
          accounting postings. A journal record does not itself approve a
          refund, send money, or prove that a provider transfer succeeded.
        </p>
      </GuideSection>

      <GuideSection id="choose-the-right-page" title="2. Choose the right page">
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Page</th>
                <th className="px-4 py-3">Use it for</th>
                <th className="px-4 py-3">It does not do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              <tr>
                <td className="px-4 py-3"><GuideLink href="/admin/financial">Finance Overview</GuideLink></td>
                <td className="px-4 py-3">Quick counts and recent posted ledger activity.</td>
                <td className="px-4 py-3">It is not a live cash balance or an approval queue.</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><GuideLink href="/admin/financial/ledger">Journal Entries</GuideLink></td>
                <td className="px-4 py-3">Inspect individual debit and credit lines for recorded transactions.</td>
                <td className="px-4 py-3">It does not initiate payments, refunds, or payout transfers.</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><GuideLink href="/admin/financial/payouts">Host Settlement Journal</GuideLink></td>
                <td className="px-4 py-3">Review payout-related postings that reached the ledger.</td>
                <td className="px-4 py-3">It is not the host withdrawal request queue.</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><GuideLink href="/admin/financial/refunds">Refund & Reversal Journal</GuideLink></td>
                <td className="px-4 py-3">Review posted refunds and confirmed reversals.</td>
                <td className="px-4 py-3">It does not list every pending refund request.</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><GuideLink href="/admin/financial/reconciliation">Ledger Reconciliation</GuideLink></td>
                <td className="px-4 py-3">Look for unbalanced entries, missing payment/payout links, or amount mismatches.</td>
                <td className="px-4 py-3">It does not automatically correct a difference.</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><GuideLink href="/admin/financial/reports">Ledger Reports</GuideLink></td>
                <td className="px-4 py-3">Review account debits, credits, and net activity over a date range.</td>
                <td className="px-4 py-3">Account totals shown are for the current page of transactions only.</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><GuideLink href="/admin/payouts?view=payments">Guest Payments</GuideLink></td>
                <td className="px-4 py-3">Inspect payment records and their operational/provider statuses.</td>
                <td className="px-4 py-3">It is not the accounting journal.</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><GuideLink href="/admin/payouts?view=payouts">Host Payouts</GuideLink></td>
                <td className="px-4 py-3">Review booking-level host payout records.</td>
                <td className="px-4 py-3">It does not replace request processing or the settlement journal.</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><GuideLink href="/admin/payouts/requests">Host Payout Requests</GuideLink></td>
                <td className="px-4 py-3">Review and process host withdrawal requests.</td>
                <td className="px-4 py-3">A requested or submitted transfer is not confirmed as paid.</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><GuideLink href="/admin/payouts/fees">Payout Fee Reconciliation</GuideLink></td>
                <td className="px-4 py-3">Record actual provider fees against eligible transfer records.</td>
                <td className="px-4 py-3">It must not be filled with an estimated fee.</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><GuideLink href="/admin/refunds">Refund Requests</GuideLink></td>
                <td className="px-4 py-3">Review operational cancellation/payment refund requests.</td>
                <td className="px-4 py-3">An approved request does not alone prove the money was returned.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection id="money-flow" title="3. How money moves">
        <ol className="space-y-3">
          {[
            ["Booking and payment", "A booking/payment begins in a pending state. A payment request or provider callback alone is not final proof that money was collected."],
            ["Collection confirmation", "A successful M-PESA collection is matched and confirmed before the payment and booking are treated as paid/confirmed. Check the payment record and provider reference when investigating."],
            ["Stay completion", "Host funds become eligible through the booking completion and payout rules. A payable balance is an amount owed, not a promise that provider float is available."],
            ["Host withdrawal", "A host request reserves a payable amount and is sent through the payout workflow. Treat submitted, processing, timeout, or uncertain results as unresolved until confirmed with the provider."],
            ["Refund or reversal", "A request/decision is a workflow state. The actual refund or reversal is only confirmed after processing/provider confirmation; then look for the corresponding journal posting."],
            ["Ledger posting", "Successful accounting events are recorded as balanced transactions with journal lines. Use the ledger and reconciliation views to verify what was posted and what source record it links to."],
          ].map(([title, description], index) => (
            <li key={title} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FDF0F5] text-sm font-semibold text-[#CF2F74]">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold text-[#1B1A2E]">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="grid gap-3 md:grid-cols-2">
          <InfoCard title="Safaricom M-PESA STK collection">
            A successful callback is checked against the initialized amount,
            phone, receipt, and Safaricom status query. Only then does one
            database transaction settle the payment and create its balanced
            journal posting. A payment received after its booking can no longer
            be confirmed is recorded as money held for refund or reconciliation,
            not as a normal confirmed booking collection. Applying the ledger
            integration also imports earlier successful Daraja collections,
            payouts, refunds, reversals, and already-reconciled fees without
            duplicating existing journal transactions.
          </InfoCard>
          <InfoCard title="When an M-PESA payment stays pending">
            In <GuideLink href="/admin/payouts?view=payments">Guest Payments</GuideLink>,
            look for a pending payment with a Safaricom attempt marked
            reconciliation required. Before posting it, find the transaction in
            the Safaricom merchant portal or statement and match its receipt,
            amount, payer phone, and East Africa transaction time to the
            displayed STK attempt. A guest-provided receipt or screenshot alone
            is not sufficient evidence. Record where you verified the entry;
            the system stores the admin, receipt, transaction time, and note in
            the payment and audit log, then settles the payment and journal
            together. If the booking hold expired or the booking is no longer
            confirmable, the payment is recorded as late and held for refund or
            reconciliation; it does not confirm the booking automatically.
          </InfoCard>
          <InfoCard title="Safaricom B2C payout and refund">
            A payout or refund enters the journal only after the B2C result
            confirms success. Host payouts are linked to the underlying payout
            records; refunds link to the related booking and payment. A request,
            an accepted initiation, or an uncertain provider result is not
            treated as money sent.
          </InfoCard>
          <InfoCard title="Safaricom payout reversals">
            A host payout reversal is journaled only after Safaricom confirms
            that the funds were reversed. Its lines restore the host payable
            for the affected payout items. Starting a reversal does not create
            a reversal posting.
          </InfoCard>
          <InfoCard title="Actual Safaricom fees">
            Collection, B2C transfer, and confirmed reversal fees are posted as
            separate processing-expense transactions when an administrator
            records the actual provider fee. Estimated fees are never posted as
            actual fees.
          </InfoCard>
        </div>
        <p className="rounded-lg border-l-4 border-blue-400 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">
          Each settlement and its journal posting are committed together.
          Duplicate callbacks use stable idempotency keys and do not create
          duplicate journal transactions. If posting validation fails, the
          settlement transaction is rolled back and the callback is marked for
          reconciliation; investigate the provider record and server logs
          rather than entering a manual journal row.
        </p>
      </GuideSection>

      <GuideSection id="journal-basics" title="4. Journal basics">
        <div className="grid gap-3 md:grid-cols-2">
          <InfoCard title="What is a transaction?">
            A transaction is the overall accounting event. It has an event type,
            a source type/reference, a status, timestamps, and one or more
            journal lines. Use its IDs and source reference to trace it back to
            the payment, payout, refund, reversal, or booking.
          </InfoCard>
          <InfoCard title="What is a journal line?">
            Each line assigns an amount to an account as either a debit or a
            credit. A line cannot have both values. For each transaction, total
            debits should equal total credits.
          </InfoCard>
          <InfoCard title="Debit and credit in this ledger">
            Debit and credit are accounting directions, not labels for
            “money-in” and “money-out” in every account. Interpret them with the
            account name and type. Compare totals only for the same transaction,
            currency, and scope.
          </InfoCard>
          <InfoCard title="Status and timestamps">
            <code>created_at</code> is when the transaction record was created;
            <code> posted_at</code> is when it was posted. Posted financial
            records are intended to be immutable; corrections should be
            traceable adjustments or reversals, not silent edits.
          </InfoCard>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="font-semibold text-[#1B1A2E]">
            Example shapes (illustrations, not live transactions)
          </h3>
          <div className="mt-3 grid gap-4 text-sm leading-6 text-gray-600 lg:grid-cols-3">
            <p>
              <strong className="text-gray-800">Guest collection:</strong> debit
              M-PESA clearing; credit host payable and deferred platform revenue.
              Recorded processing fees add an expense and corresponding clearing
              credit.
            </p>
            <p>
              <strong className="text-gray-800">Host payout:</strong> debit host
              payable; credit payout liability. Recorded payout fees are shown
              separately from the host payable.
            </p>
            <p>
              <strong className="text-gray-800">Refund/reversal:</strong> a
              refund posting debits guest refund payable and credits clearing; a
              confirmed host payout reversal debits host payout liabilities and
              credits host payables to restore the amount due to the host.
            </p>
          </div>
          <p className="mt-3 text-xs leading-5 text-gray-500">
            These examples explain the current automated posting flow. They are not a
            substitute for checking the actual lines, amounts, and references
            on a transaction.
          </p>
        </div>
      </GuideSection>

      <GuideSection id="accounts" title="5. Account reference">
        <p className="text-sm leading-6 text-gray-600">
          The ledger uses a chart of accounts. The account type helps explain
          which side usually increases an account; when in doubt, inspect the
          transaction context and ask the finance owner rather than changing a
          posted entry.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <InfoCard title="What an account code means">
            An account code is the fixed identifier for a category of money in
            the ledger. For example,{" "}
            <code>1100_M_PESA_CLEARING</code> identifies the account used for
            collected M-PESA funds. Each journal line uses a code to show which
            account is being debited or credited.
          </InfoCard>
          <InfoCard title="How account codes are assigned">
            These codes are predefined in the chart of accounts and added to the
            database by a migration. They are not generated separately for
            each host, booking, payment, or transaction. The number and text
            together identify the account; the number prefix is a category
            convention, not a unique record number.
          </InfoCard>
          <InfoCard title="What is generated for each transaction">
            Ledger transactions and journal lines receive their own database
            IDs. The payment, payout, refund, or reversal also keeps its own
            source ID and reference. These identify individual records; they do
            not create new account codes.
          </InfoCard>
          <InfoCard title="Can an administrator create or change a code?">
            No. Do not invent a code or edit the chart while processing a
            payment. New accounts or changes to account meaning should be
            reviewed by the finance owner and introduced through a controlled
            chart-of-accounts update.
          </InfoCard>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Plain-language meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {CHART_OF_ACCOUNTS.map((account) => (
                <tr key={account.code}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-700">
                    {account.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1B1A2E]">{account.name}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{account.type}</td>
                  <td className="px-4 py-3 text-gray-600">{account.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection id="common-tasks" title="6. Common tasks">
        <div className="space-y-3">
          <details className="rounded-lg border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold text-[#1B1A2E]">
              Investigate a guest payment
            </summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-600">
              <li>Open <GuideLink href="/admin/payouts?view=payments">Guest Payments</GuideLink> and find the payment using its booking, provider, or reference details.</li>
              <li>Check the payment status, amount, paid time, and provider reference. Do not infer success from a pending request or a guest screenshot alone.</li>
              <li>If the record is marked for reconciliation, compare the authoritative provider transaction details and check <GuideLink href="/admin/financial/reconciliation">Ledger Reconciliation</GuideLink>.</li>
              <li>Open <GuideLink href="/admin/financial/ledger">Journal Entries</GuideLink> to confirm whether a financial posting exists and whether its debits and credits balance.</li>
              <li>If still unclear, preserve the payment ID, booking ID, provider reference, and timestamps for escalation. Do not manually create a replacement payment or journal row.</li>
            </ol>
          </details>
          <details className="rounded-lg border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold text-[#1B1A2E]">
              Review a host payout request
            </summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-600">
              <li>Open <GuideLink href="/admin/payouts/requests">Host Payout Requests</GuideLink> and check the request status, reserved amount, destination method, and host details.</li>
              <li>Confirm the payout destination and amount against the approved request. Check fees and net amount where shown.</li>
              <li>Use the page&apos;s available action for the appropriate workflow. Do not send a second transfer when the first result is processing, timed out, or ambiguous.</li>
              <li>Wait for the provider result before considering the request paid. Then compare the operational payout record with the <GuideLink href="/admin/financial/payouts">Host Settlement Journal</GuideLink>.</li>
              <li>Record actual provider fees using <GuideLink href="/admin/payouts/fees">Payout Fee Reconciliation</GuideLink> and authoritative provider records only.</li>
            </ol>
          </details>
          <details className="rounded-lg border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold text-[#1B1A2E]">
              Review a guest refund
            </summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-600">
              <li>Open <GuideLink href="/admin/refunds">Refund Requests</GuideLink> and review the request type, booking/payment, reason, and current status.</li>
              <li>Check eligibility and the booking/refund policy details shown by the workflow. If declining, provide the required reason.</li>
              <li>An approval may authorize transfer processing; it is not proof that the refund has reached the guest. Follow its transfer/provider state to completion.</li>
              <li>Once the refund is confirmed as processed, check <GuideLink href="/admin/financial/refunds">Refund & Reversal Journal</GuideLink> for the resulting posting.</li>
            </ol>
          </details>
          <details className="rounded-lg border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold text-[#1B1A2E]">
              Check a reconciliation discrepancy
            </summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-600">
              <li>Open <GuideLink href="/admin/financial/reconciliation">Ledger Reconciliation</GuideLink> and note the transaction ID, source type, and source reference.</li>
              <li>“Unmatched” means the expected payment/payout source record could not be found for that journal transaction. “Amount mismatch” means compared values differ. “Needs review” can also mean journal debits and credits do not balance.</li>
              <li>Open the operational payment or payout screen and compare IDs, amounts, currency, and status with the ledger rows.</li>
              <li>Check all pages: the discrepancy count and rows are limited to the current page. This screen flags issues; it does not repair them.</li>
              <li>Capture the exact transaction/source IDs and supporting provider evidence, then escalate to the finance or engineering owner for a controlled, audited correction.</li>
            </ol>
          </details>
          <details className="rounded-lg border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold text-[#1B1A2E]">
              Build a date-filtered report
            </summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-600">
              <li>Open <GuideLink href="/admin/financial/reports">Ledger Reports</GuideLink>, set a start date and/or end date, then select “Apply dates”.</li>
              <li>Use the account table to compare debit, credit, and net (credit less debit) totals for the visible page.</li>
              <li>Use pagination to examine the other transactions within that date range. The account totals are page-level, not a full-range aggregate.</li>
              <li>For a complete period total, combine all pages carefully or request a separately validated export/report from the finance owner.</li>
            </ol>
          </details>
        </div>
      </GuideSection>

      <GuideSection id="statuses-and-matching" title="7. Statuses, matching, and pagination">
        <div className="grid gap-3 md:grid-cols-2">
          <InfoCard title="Operational status is not ledger status">
            A payment or payout may have its own workflow status in the Payments
            or Payouts screens. The journal transaction has a separate
            accounting status. Confirm both before concluding an event is
            complete.
          </InfoCard>
          <InfoCard title="Pending, processing, or ambiguous">
            Treat unresolved provider states as unresolved. Avoid retrying a
            transfer until the original attempt is confirmed failed or safely
            reconciled; otherwise a duplicate transfer may occur.
          </InfoCard>
          <InfoCard title="Source match">
            Reconciliation uses linked payment/payout IDs where available. A
            missing link is a signal to investigate IDs and migrations, not
            proof by itself that funds were lost.
          </InfoCard>
          <InfoCard title="Page limits">
            Journal pages show up to 25 transactions at a time. Overview and
            report counts/totals must be interpreted in their stated scope.
            Reconciliation&apos;s discrepancy count is for the current page,
            so inspect later pages too.
          </InfoCard>
        </div>
        <p className="text-sm leading-6 text-gray-600">
          In the ledger pages, a date is displayed in East Africa Time when
          possible. Reports filter on the transaction creation timestamp
          (<code>created_at</code>) and summarize entries attached to the
          transactions on the current page.
        </p>
      </GuideSection>

      <GuideSection id="when-stuck" title="8. When something looks wrong">
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">What you see</th>
                <th className="px-4 py-3">What to check next</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              <tr>
                <td className="px-4 py-3">No journal transaction</td>
                <td className="px-4 py-3">Check the operational record and provider result first. A pending or failed attempt should not create a posted journal event. For a verified success with a reconciliation-required callback, keep the provider reference and callback time and escalate to the system owner; do not create a manual duplicate entry.</td>
              </tr>
              <tr>
                <td className="px-4 py-3">No lines on a transaction</td>
                <td className="px-4 py-3">Record the transaction ID and report it. A transaction without lines cannot be validated as balanced.</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Unbalanced or mismatched</td>
                <td className="px-4 py-3">Compare every debit/credit line and the linked source record. Do not edit posted entries directly.</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Transfer says processing or timed out</td>
                <td className="px-4 py-3">Check the provider attempt/result and reconciliation state before retrying or telling the host/guest it succeeded.</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Page shows no results</td>
                <td className="px-4 py-3">Clear filters or date range, return to page 1, check the other workflow screen, and confirm the financial-ledger migration was applied.</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Finance page reports an error</td>
                <td className="px-4 py-3">Retry once. If it persists, capture the page, timestamp, and record ID and ask the system owner to check server logs/schema deployment.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection id="safe-handling" title="9. Safe handling and access">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-gray-600">
          <li>Finance information is restricted to authorized administrators. Do not share screenshots, payout destinations, guest details, or identifiers outside approved channels.</li>
          <li>Use the provider statement/receipt as authoritative evidence for settlement and actual fees; never estimate a missing fee or infer a transfer from a request state.</li>
          <li>Do not create duplicate transfers to resolve an uncertain result. Resolve the original attempt first.</li>
          <li>Posted journal entries are protected from ordinary edits. Corrections should follow an approved, auditable reversal or adjustment workflow.</li>
          <li>Use record IDs, source references, timestamps, amounts, and provider receipt/transaction references when escalating an issue.</li>
          <li>This guide is an operational aid, not accounting, legal, tax, or refund-policy advice. Escalate accounting treatment or policy exceptions to the responsible finance owner.</li>
        </ul>
      </GuideSection>

      <footer className="rounded-xl border border-[#F2C5D8] bg-[#FDF0F5] p-5">
        <h2 className="font-semibold text-[#1B1A2E]">Need a quick route?</h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <GuideLink href="/admin/financial">Finance overview</GuideLink>
          <GuideLink href="/admin/financial/ledger">Journal</GuideLink>
          <GuideLink href="/admin/payouts/requests">Host payout requests</GuideLink>
          <GuideLink href="/admin/refunds">Refund requests</GuideLink>
          <GuideLink href="/admin/financial/reconciliation">Reconciliation</GuideLink>
          <GuideLink href="/admin/audit-log">Admin audit log</GuideLink>
        </div>
      </footer>
    </article>
  );
}
