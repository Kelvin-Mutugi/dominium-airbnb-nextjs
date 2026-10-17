// app/admin/page.tsx
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  LifeBuoy,
  MapPin,
  ScrollText,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type QueueItem = {
  id: string;
  label: string;
  meta: string;
  href: string;
  since: string | null;
};

type WorkQueue = {
  id: string;
  title: string;
  count: number;
  href: string;
  items: QueueItem[];
};

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

function exactCount(
  result: {
    count: number | null;
    error: { code?: string; message: string } | null;
  },
  label: string,
) {
  if (result.error) {
    console.error(`Unable to load ${label} for the admin dashboard:`, result.error);
    throw new Error(`Unable to load ${label} for the admin dashboard.`);
  }
  if (result.count === null) {
    throw new Error(`Unable to determine the ${label} count for the admin dashboard.`);
  }
  return result.count;
}

async function getDashboardStats() {
  const admin = getSupabaseAdmin();
  const [
    paymentRefundReview,
    cancellationRefundReview,
    paymentRefundProcessing,
    cancellationRefundProcessing,
    failedPayments,
    paymentSupportCases,
  ] = await Promise.all([
    admin
      .from("payment_refund_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "awaiting_admin_review"),
    admin
      .from("booking_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("request_type", "cancellation")
      .eq("status", "approved")
      .eq("refund_processing_status", "awaiting_admin_review"),
    admin
      .from("payment_refund_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "awaiting_manual_processing"),
    admin
      .from("booking_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("request_type", "cancellation")
      .eq("status", "approved")
      .eq("refund_processing_status", "awaiting_manual_processing"),
    admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    admin
      .from("support_cases")
      .select("id", { count: "exact", head: true })
      .eq("category", "payment_refund")
      .eq("support_context", "account")
      .in("status", ["new", "in_review", "waiting_on_user"]),
  ]);

  const financeQueries = [
    ["payment refund requests", paymentRefundReview],
    ["cancellation refund requests", cancellationRefundReview],
    ["approved payment refunds", paymentRefundProcessing],
    ["approved cancellation refunds", cancellationRefundProcessing],
    ["failed payments", failedPayments],
    ["payment support cases", paymentSupportCases],
  ] as const;
  const [
    paymentRefundReviewCount,
    cancellationRefundReviewCount,
    paymentRefundProcessingCount,
    cancellationRefundProcessingCount,
    failedPaymentCount,
    paymentSupportCaseCount,
  ] = financeQueries.map(([label, result]) => exactCount(result, label));

  const now = new Date();
  const currentMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const months = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(
      Date.UTC(
        currentMonth.getUTCFullYear(),
        currentMonth.getUTCMonth() - (5 - index),
        1,
      ),
    );
    const end = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    );
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label: start.toLocaleDateString("en", {
        month: "short",
        timeZone: "UTC",
      }),
    };
  });
  const paymentTrendResults = await Promise.all(
    months.flatMap(({ start, end }) => [
      admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid")
        .gte("created_at", start)
        .lt("created_at", end),
      admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", start)
        .lt("created_at", end),
    ]),
  );
  const paymentTrend = months.map(({ label }, index) => {
    const paid = paymentTrendResults[index * 2];
    const failed = paymentTrendResults[index * 2 + 1];
    return {
      month: label,
      paid: exactCount(paid, "monthly paid payment activity"),
      failed: exactCount(failed, "monthly failed payment activity"),
    };
  });

  const queueResults = await Promise.all([
    admin
      .from("payment_refund_requests")
      .select("id, booking_id, status, created_at", { count: "exact" })
      .eq("status", "awaiting_admin_review")
      .order("created_at", { ascending: true })
      .limit(5),
    admin
      .from("booking_change_requests")
      .select("id, booking_id, status:refund_processing_status, created_at", { count: "exact" })
      .eq("request_type", "cancellation")
      .eq("status", "approved")
      .eq("refund_processing_status", "awaiting_admin_review")
      .order("created_at", { ascending: true })
      .limit(5),
    admin
      .from("profiles")
      .select("id, full_name, business_name, kyc_submitted_at", { count: "exact" })
      .eq("role", "host")
      .eq("kyc_status", "pending")
      .not("kyc_submitted_at", "is", null)
      .order("kyc_submitted_at", { ascending: true, nullsFirst: true })
      .limit(5),
    admin
      .from("support_cases")
      .select("id, subject, status, updated_at", { count: "exact" })
      .in("status", ["new", "in_review", "waiting_on_user"])
      .order("updated_at", { ascending: true })
      .limit(5),
    admin
      .from("host_payout_requests")
      .select("id, amount, status, requested_at", { count: "exact" })
      .in("status", ["requested", "processing"])
      .order("requested_at", { ascending: true })
      .limit(5),
    admin
      .from("host_listing_requests")
      .select("id, host_id, proposed_title, property_type, town, county, updated_at", { count: "exact" })
      .in("status", ["submitted", "reviewing", "visit_scheduled", "visited", "details_collected"])
      .order("updated_at", { ascending: true })
      .limit(5),
    admin
      .from("host_listing_change_requests")
      .select("id, listing_id, created_at, listing:listings(title)", { count: "exact" })
      .eq("status", "pending_review")
      .order("created_at", { ascending: true })
      .limit(5),
  ]);
  const queueLabels = [
    "payment refunds awaiting review",
    "cancellation refunds awaiting review",
    "host verification",
    "support cases",
    "host payout requests",
    "property visit requests",
    "host listing changes",
  ] as const;
  if (queueResults.length !== queueLabels.length) {
    throw new Error("Admin dashboard queue configuration is inconsistent.");
  }
  for (const [index, result] of queueResults.entries()) {
    exactCount(result, queueLabels[index]);
    if (result.data === null) {
      throw new Error(`Unable to load ${queueLabels[index]} items for the admin dashboard.`);
    }
  }
  const [
    { data: paymentRefundQueue, count: paymentRefundQueueCount },
    { data: cancellationRefundQueue, count: cancellationRefundQueueCount },
    { data: pendingHostQueue, count: pendingHostCount },
    { data: openSupportQueue, count: openSupportCount },
    { data: hostPayoutRequestQueue, count: hostPayoutRequestCount },
    { data: propertyRequestQueue, count: propertyRequestCount },
    { data: listingChangeQueue, count: listingChangeCount },
  ] = queueResults;

  const refundQueueItems = [
    ...(paymentRefundQueue ?? []).map((item) => ({
      id: `payment-${item.id}`,
      label: `Payment refund · booking ${item.booking_id.slice(0, 8)}`,
      meta: capitalize(item.status.replaceAll("_", " ")),
      href: "/admin/refunds?view=review",
      since: item.created_at,
    })),
    ...(cancellationRefundQueue ?? []).map((item) => ({
      id: `cancellation-${item.id}`,
      label: `Cancellation refund · booking ${item.booking_id.slice(0, 8)}`,
      meta: capitalize(item.status.replaceAll("_", " ")),
      href: "/admin/refunds?view=review",
      since: item.created_at,
    })),
  ]
    .sort((a, b) => new Date(a.since).getTime() - new Date(b.since).getTime())
    .slice(0, 5);

  const workQueues: WorkQueue[] = [
    {
      id: "refunds",
      title: "Refunds to review",
      count: (paymentRefundQueueCount ?? 0) + (cancellationRefundQueueCount ?? 0),
      href: "/admin/refunds?view=review",
      items: refundQueueItems,
    },
    {
      id: "verification",
      title: "Host verification",
      count: pendingHostCount ?? 0,
      href: "/admin/verification",
      items: (pendingHostQueue ?? []).map((item) => ({
        id: item.id,
        label: item.business_name ?? item.full_name ?? "Host application",
        meta: item.kyc_submitted_at
          ? `Submitted ${new Date(item.kyc_submitted_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`
          : "Submission date unavailable",
        href: "/admin/verification",
        since: item.kyc_submitted_at,
      })),
    },
    {
      id: "support",
      title: "Open support cases",
      count: openSupportCount ?? 0,
      href: "/admin/support?status=open",
      items: (openSupportQueue ?? []).map((item) => ({
        id: item.id,
        label: item.subject,
        meta: capitalize(item.status.replaceAll("_", " ")),
        href: "/admin/support?status=open",
        since: item.updated_at,
      })),
    },
    {
      id: "payouts",
      title: "Payout Requests",
      count: hostPayoutRequestCount ?? 0,
      href: "/admin/payouts/requests",
      items: (hostPayoutRequestQueue ?? []).map((item) => ({
        id: item.id,
        label: `KES ${Number(item.amount).toLocaleString("en-KE")}`,
        meta: capitalize(item.status),
        href: "/admin/payouts/requests",
        since: item.requested_at,
      })),
    },
    {
      id: "property-requests",
      title: "Host property visit requests",
      count: propertyRequestCount ?? 0,
      href: "/admin/listing-requests?status=open",
      items: (propertyRequestQueue ?? []).map((item) => ({
        id: item.id,
        label: item.proposed_title,
        meta: `${capitalize(String(item.property_type))} in ${item.town}, ${item.county}`,
        href: "/admin/listing-requests?status=open",
        since: item.updated_at,
      })),
    },
    {
      id: "listing-changes",
      title: "Host listing changes",
      count: listingChangeCount ?? 0,
      href: "/admin/listing-changes?status=pending_review",
      items: (listingChangeQueue ?? []).map((item) => {
        const listing = Array.isArray(item.listing)
          ? item.listing[0]
          : item.listing;
        return {
          id: item.id,
          label: listing?.title ?? "Listing change request",
          meta: "Awaiting review",
          href: "/admin/listing-changes?status=pending_review",
          since: item.created_at,
        };
      }),
    },
  ];

  return {
    financeAttention: {
      refundsAwaitingDecision:
        paymentRefundReviewCount + cancellationRefundReviewCount,
      refundsAwaitingProcessing:
        paymentRefundProcessingCount + cancellationRefundProcessingCount,
      failedPayments: failedPaymentCount,
      paymentSupportCases: paymentSupportCaseCount,
    },
    paymentTrend,
    workQueues,
    loadedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* Shared look                                                         */
/* ------------------------------------------------------------------ */

const CARD =
  "rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(27,26,46,0.04)]";
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CF2F74]";

const QUEUE_META: Record<string, { icon: LucideIcon; tint: string; noun: string }> = {
  refunds: { icon: AlertTriangle, tint: "bg-rose-50 text-rose-700", noun: "Refunds awaiting decision" },
  verification: { icon: ShieldCheck, tint: "bg-emerald-50 text-emerald-700", noun: "Hosts to verify" },
  support: { icon: LifeBuoy, tint: "bg-amber-50 text-amber-700", noun: "Open support cases" },
  payouts: { icon: Wallet, tint: "bg-rose-50 text-rose-700", noun: "Payout Requests" },
  "property-requests": { icon: MapPin, tint: "bg-orange-50 text-orange-700", noun: "Host property visit requests" },
  "listing-changes": { icon: ClipboardCheck, tint: "bg-indigo-50 text-indigo-700", noun: "Listing changes to review" },
};

function ageOf(since: string | null, now: number) {
  if (!since) return null;
  const time = new Date(since).getTime();
  if (Number.isNaN(time)) return null;
  const days = Math.max(0, Math.floor((now - time) / 86_400_000));
  return {
    days,
    label: days === 0 ? "Today" : `${days}d`,
    tone: days >= 7 ? "red" : days >= 3 ? "amber" : "grey",
  } as const;
}

function AgeChip({ since, now }: { since: string | null; now: number }) {
  const age = ageOf(since, now);
  if (!age) return null;
  const tones = {
    red: "bg-red-50 text-red-700 ring-red-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    grey: "bg-gray-50 text-gray-600 ring-gray-200",
  };
  return (
    <span
      title={`Waiting ${age.days === 0 ? "since today" : `${age.days} ${age.days === 1 ? "day" : "days"}`}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ring-1 ring-inset ${tones[age.tone]}`}
    >
      <Clock className="h-3 w-3" aria-hidden="true" />
      {age.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* KPI tile                                                            */
/* ------------------------------------------------------------------ */

function KpiTile({ queue, now }: { queue: WorkQueue; now: number }) {
  const meta = QUEUE_META[queue.id];
  const Icon = meta.icon;
  const oldest = ageOf(queue.items[0]?.since ?? null, now);
  const clear = queue.count === 0;

  return (
    <Link
      href={queue.href}
      aria-label={`${meta.noun}: ${queue.count}`}
      className={`group flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(27,26,46,0.04)] transition hover:border-[#CF2F74]/40 hover:shadow-md ${FOCUS}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.tint}`}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <ArrowUpRight
          className="h-4 w-4 text-gray-300 transition group-hover:text-[#CF2F74]"
          aria-hidden="true"
        />
      </div>
      <p
        className={`mt-4 text-3xl font-semibold tabular-nums tracking-tight ${
          clear ? "text-gray-300" : "text-[#1B1A2E]"
        }`}
      >
        {queue.count}
      </p>
      <p className="mt-0.5 text-sm font-medium text-gray-700">{meta.noun}</p>
      <p className="mt-2 text-xs text-gray-500">
        {clear ? (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            All clear
          </span>
        ) : oldest ? (
          <span
            className={
              oldest.tone === "red"
                ? "font-medium text-red-700"
                : oldest.tone === "amber"
                  ? "font-medium text-amber-800"
                  : ""
            }
          >
            Oldest waiting {oldest.days === 0 ? "since today" : `${oldest.days}d`}
          </span>
        ) : (
          "Open queue"
        )}
      </p>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Queue panel                                                         */
/* ------------------------------------------------------------------ */

function QueuePanel({ queue, now }: { queue: WorkQueue; now: number }) {
  const meta = QUEUE_META[queue.id];
  const Icon = meta.icon;
  const hiddenCount = Math.max(0, queue.count - queue.items.length);

  return (
    <section className={`flex min-w-0 flex-col ${CARD}`}>
      <header className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.tint}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <h3 className="truncate text-sm font-semibold text-[#1B1A2E]">
            {queue.title}
          </h3>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
            queue.count > 0
              ? "bg-[#FDF0F5] text-[#CF2F74]"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {queue.count}
        </span>
      </header>

      {queue.items.length ? (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {queue.items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${FOCUS} focus-visible:-outline-offset-2`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[#1B1A2E]">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-gray-500">
                    {item.meta}
                  </span>
                </span>
                <AgeChip since={item.since} now={now} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 items-center gap-2 border-t border-gray-100 px-4 py-6 text-sm text-gray-500">
          <CheckCircle2
            className="h-4 w-4 text-emerald-600"
            aria-hidden="true"
          />
          Nothing is waiting here.
        </div>
      )}

      <Link
        href={queue.href}
        className={`mt-auto flex items-center justify-between rounded-b-2xl border-t border-gray-100 px-4 py-2.5 text-xs font-semibold text-[#CF2F74] hover:bg-[#FDF0F5] ${FOCUS} focus-visible:-outline-offset-2`}
      >
        <span>
          {hiddenCount > 0 ? `View all ${queue.count}` : "Open queue"}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Payments chart                                                      */
/* ------------------------------------------------------------------ */

function PaymentsChart({
  paymentTrend,
}: {
  paymentTrend: Array<{ month: string; paid: number; failed: number }>;
}) {
  const totalPaid = paymentTrend.reduce((sum, m) => sum + m.paid, 0);
  const totalFailed = paymentTrend.reduce((sum, m) => sum + m.failed, 0);
  const finalizedPayments = totalPaid + totalFailed;
  const paidShare =
    finalizedPayments > 0
      ? Math.round((totalPaid / finalizedPayments) * 100)
      : null;
  const biggest = Math.max(0, ...paymentTrend.flatMap((m) => [m.paid, m.failed]));
  const yMax = Math.max(4, Math.ceil(biggest / 4) * 4);

  return (
    <section className={`p-5 ${CARD}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#1B1A2E]">
            Guest payments
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Records created each month, grouped by current status · last 6 months
          </p>
        </div>
        <div className="flex gap-4 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-emerald-500" aria-hidden="true" />
            Paid
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-rose-400" aria-hidden="true" />
            Failed
          </span>
        </div>
      </header>

      {/* Summary numbers */}
      <dl className="mt-4 grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-gray-50">
        <div className="px-4 py-3">
          <dt className="text-xs text-gray-500">Paid</dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-[#1B1A2E]">
            {totalPaid.toLocaleString("en-KE")}
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs text-gray-500">Failed</dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-[#1B1A2E]">
            {totalFailed.toLocaleString("en-KE")}
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs text-gray-500">Paid share of paid/failed records</dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-[#1B1A2E]">
            {paidShare === null ? "—" : `${paidShare}%`}
          </dd>
        </div>
      </dl>

      {/* Chart */}
      <div
        role="img"
        aria-label={`Monthly guest payment records: ${paymentTrend.map((m) => `${m.month}, ${m.paid} paid, ${m.failed} failed`).join("; ")}`}
        className="mt-5"
      >
        <div className="relative h-56">
          {/* gridlines + y labels */}
          {[0, 1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className="absolute inset-x-0 flex -translate-y-1/2 items-center"
              style={{ top: `${(step / 4) * 100}%` }}
            >
              <span className="w-9 pr-2 text-right text-[10px] tabular-nums text-gray-400">
                {Math.round(yMax * (1 - step / 4))}
              </span>
              <span
                className={`h-px flex-1 ${step === 4 ? "bg-gray-300" : "bg-gray-100"}`}
              />
            </div>
          ))}
          {/* bars */}
          <div className="absolute inset-y-0 left-9 right-0 grid grid-cols-6">
            {paymentTrend.map((month) => (
              <div
                key={month.month}
                className="flex items-end justify-center gap-1.5 px-1 sm:gap-2"
              >
                <div
                  title={`${month.month}: ${month.paid} paid`}
                  className="w-full max-w-8 rounded-t-md bg-emerald-500"
                  style={{ height: `${(month.paid / yMax) * 100}%` }}
                />
                <div
                  title={`${month.month}: ${month.failed} failed`}
                  className="w-full max-w-8 rounded-t-md bg-rose-400"
                  style={{ height: `${(month.failed / yMax) * 100}%` }}
                />
              </div>
            ))}
          </div>
          {finalizedPayments === 0 && (
            <p className="absolute inset-x-9 top-1/2 -translate-y-1/2 text-center text-sm text-gray-500">
              No paid or failed payments in this period.
            </p>
          )}
        </div>
        {/* x labels with exact numbers */}
        <div className="mt-2 grid grid-cols-6 pl-9">
          {paymentTrend.map((month) => (
            <div key={month.month} className="text-center">
              <p className="text-xs font-medium text-gray-700">{month.month}</p>
              <p className="mt-0.5 text-[11px] tabular-nums">
                <span className="text-emerald-700">{month.paid}</span>
                <span className="text-gray-300"> / </span>
                <span className="text-rose-600">{month.failed}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Includes only records currently marked paid or failed; pending and
        refunded records are excluded. The current month is still in progress.
        Counts are records, not money received.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const { financeAttention, workQueues, paymentTrend } = stats;
  const now = stats.loadedAt;

  const financeQueues = [
    {
      label: "Refunds awaiting decision",
      count: financeAttention.refundsAwaitingDecision,
      href: "/admin/refunds?view=review",
      bar: "bg-amber-500",
    },
    {
      label: "Approved refunds to process",
      count: financeAttention.refundsAwaitingProcessing,
      href: "/admin/refunds?view=approved",
      bar: "bg-orange-500",
    },
    {
      label: "Failed payment records",
      count: financeAttention.failedPayments,
      href: "/admin/payouts?view=payments&status=failed",
      bar: "bg-rose-500",
    },
    {
      label: "Account payment support cases",
      count: financeAttention.paymentSupportCases,
      href: "/admin/support?category=payment_refund&status=open",
      bar: "bg-sky-500",
    },
  ];
  const financeTotal = financeQueues.reduce((sum, q) => sum + q.count, 0);
  const maxFinance = Math.max(1, ...financeQueues.map((q) => q.count));
  const operationsTotal = workQueues.reduce((sum, q) => sum + q.count, 0);
  const totalAttention =
    operationsTotal +
    financeTotal -
    financeAttention.paymentSupportCases -
    financeAttention.refundsAwaitingDecision;

  // Oldest waiting items across every queue, so the most overdue work is first
  const oldestWaiting = workQueues
    .flatMap((queue) =>
      queue.items
        .filter((item) => item.since)
        .map((item) => ({ ...item, queueId: queue.id, queueTitle: queue.title })),
    )
    .sort(
      (a, b) =>
        new Date(a.since as string).getTime() -
        new Date(b.since as string).getTime(),
    )
    .slice(0, 6);

  const updatedAt = new Date(stats.loadedAt).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  });

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1B1A2E] sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            What needs a decision today, and how payments are doing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
              totalAttention === 0
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-amber-50 text-amber-900 ring-amber-200"
            }`}
          >
            {totalAttention === 0 ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            )}
            {totalAttention === 0
              ? "Everything is up to date"
              : `${totalAttention.toLocaleString("en-KE")} ${totalAttention === 1 ? "item needs" : "items need"} attention`}
          </span>
          <Link
            href="/admin/audit-log"
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#1B1A2E] transition hover:bg-gray-50 ${FOCUS}`}
          >
            <ScrollText className="h-4 w-4 text-gray-500" aria-hidden="true" />
            Audit log
          </Link>
        </div>
      </header>

      {/* KPI tiles: one per work queue */}
      <section
        aria-label="Work queue totals"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6"
      >
        {workQueues.map((queue) => (
          <KpiTile key={queue.id} queue={queue} now={now} />
        ))}
      </section>

      {/* Main + sidebar */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        {/* ============ MAIN ============ */}
        <div className="min-w-0 space-y-6">
          <PaymentsChart paymentTrend={paymentTrend} />

          <section aria-labelledby="work-queues-heading" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2 px-1">
              <div>
                <h2
                  id="work-queues-heading"
                  className="text-base font-semibold text-[#1B1A2E]"
                >
                  Work queues
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  The oldest items are listed first. The clock shows how long
                  each has been waiting.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {workQueues.map((queue) => (
                <QueuePanel key={queue.id} queue={queue} now={now} />
              ))}
            </div>
          </section>
        </div>

        {/* ============ SIDEBAR ============
            Sits above the charts on smaller screens so urgent work is seen first.
            Stays in view on wide screens. */}
        <aside
          aria-label="Priority and finance"
          className="order-first space-y-4 xl:sticky xl:top-6 xl:order-none xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pr-1"
        >
          {/* Oldest waiting */}
          <section
            aria-labelledby="oldest-waiting-heading"
            className={CARD}
          >
            <header className="px-5 pb-3 pt-4">
              <h2
                id="oldest-waiting-heading"
                className="text-base font-semibold text-[#1B1A2E]"
              >
                Waiting the longest
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Start here. These have been open the longest across all queues.
              </p>
            </header>
            {oldestWaiting.length ? (
              <ul className="divide-y divide-gray-100 border-t border-gray-100">
                {oldestWaiting.map((item) => {
                  const meta = QUEUE_META[item.queueId];
                  const Icon = meta.icon;
                  return (
                    <li key={`${item.queueId}-${item.id}`}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50 ${FOCUS} focus-visible:-outline-offset-2`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tint}`}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[#1B1A2E]">
                            {item.label}
                          </span>
                          <span className="block truncate text-xs text-gray-500">
                            {item.queueTitle}
                          </span>
                        </span>
                        <AgeChip since={item.since} now={now} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-6 text-sm text-gray-500">
                <CheckCircle2
                  className="h-4 w-4 text-emerald-600"
                  aria-hidden="true"
                />
                Nothing is waiting.
              </div>
            )}
          </section>

          {/* Finance queues */}
          <section
            aria-labelledby="finance-queues-heading"
            className={`p-5 ${CARD}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="finance-queues-heading"
                  className="text-base font-semibold text-[#1B1A2E]"
                >
                  Finance queues
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  {financeTotal === 0
                    ? "Nothing is waiting."
                    : `${financeTotal.toLocaleString("en-KE")} items to review`}
                </p>
              </div>
              <Link
                href="/admin/refunds?view=review"
                className={`rounded text-xs font-semibold text-[#CF2F74] hover:underline ${FOCUS}`}
              >
                Review refunds
              </Link>
            </div>

            <ul className="mt-4 space-y-4">
              {financeQueues.map((queue) => (
                <li key={queue.label}>
                  <Link
                    href={queue.href}
                    aria-label={`${queue.label}: ${queue.count}. Open queue`}
                    className={`group block rounded-md ${FOCUS}`}
                  >
                    <span className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-700 group-hover:text-[#CF2F74]">
                        {queue.label}
                      </span>
                      <span className="font-semibold tabular-nums text-[#1B1A2E]">
                        {queue.count}
                      </span>
                    </span>
                    <span className="block h-2 overflow-hidden rounded-full bg-gray-100">
                      <span
                        className={`block h-full rounded-full ${queue.bar}`}
                        style={{
                          width: `${queue.count > 0 ? Math.max(4, (queue.count / maxFinance) * 100) : 0}%`,
                        }}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {financeTotal === 0 && (
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                No finance items are waiting.
              </p>
            )}
          </section>

          <p className="px-1 text-xs text-gray-400">Updated {updatedAt} (EAT)</p>
        </aside>
      </div>
    </div>
  );
}