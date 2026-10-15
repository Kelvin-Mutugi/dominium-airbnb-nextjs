// app/admin/page.tsx
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import Link from "next/link";

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
  for (const [label, result] of financeQueries) {
    if (result.error) {
      console.error(`Unable to load ${label} for the admin dashboard:`, result.error);
      throw new Error(`Unable to load ${label} for the admin dashboard.`);
    }
  }

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
    if (paid.error || failed.error) {
      console.error("Unable to load monthly payment activity:", paid.error ?? failed.error);
      throw new Error("Unable to load monthly payment activity for the admin dashboard.");
    }
    return {
      month: label,
      paid: paid.count ?? 0,
      failed: failed.count ?? 0,
    };
  });

  const [
    { data: pendingListingQueue, count: pendingListingCount },
    { data: pendingBookingQueue, count: pendingBookingCount },
    { data: pendingHostQueue, count: pendingHostCount },
    { data: openSupportQueue, count: openSupportCount },
    { data: owedPayoutQueue, count: owedPayoutCount },
    { data: propertyRequestQueue, count: propertyRequestCount },
  ] = await Promise.all([
    admin
      .from("listings")
      .select("id, title, town, county, created_at", { count: "exact" })
      .eq("status", "pending_review")
      .order("created_at", { ascending: true })
      .limit(5),
    admin
      .from("bookings")
      .select("id, guest_name, created_at", { count: "exact" })
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5),
    admin
      .from("profiles")
      .select("id, full_name, business_name, kyc_submitted_at", { count: "exact" })
      .eq("role", "host")
      .eq("kyc_status", "pending")
      .order("kyc_submitted_at", { ascending: true, nullsFirst: true })
      .limit(5),
    admin
      .from("support_cases")
      .select("id, subject, status, created_at", { count: "exact" })
      .in("status", ["new", "in_review", "waiting_on_user"])
      .order("created_at", { ascending: true })
      .limit(5),
    admin
      .from("payouts")
      .select("id, amount, status, created_at", { count: "exact" })
      .eq("status", "owed")
      .order("created_at", { ascending: true })
      .limit(5),
    admin
      .from("host_listing_requests")
      .select("id, host_id, proposed_title, property_type, town, county, created_at", { count: "exact" })
      .in("status", ["submitted", "reviewing", "visit_scheduled", "visited", "details_collected"])
      .order("created_at", { ascending: true })
      .limit(5),
  ]);

  return {
    pendingListings: pendingListingCount ?? 0,
    pendingBookings: pendingBookingCount ?? 0,
    owedPayoutCount: owedPayoutCount ?? 0,
    financeAttention: {
      refundsAwaitingDecision:
        (paymentRefundReview.count ?? 0) +
        (cancellationRefundReview.count ?? 0),
      refundsAwaitingProcessing:
        (paymentRefundProcessing.count ?? 0) +
        (cancellationRefundProcessing.count ?? 0),
      failedPayments: failedPayments.count ?? 0,
      paymentSupportCases: paymentSupportCases.count ?? 0,
    },
    paymentTrend,
    workQueues: [
      {
        id: "listings",
        title: "Listing review",
        count: pendingListingCount ?? 0,
        href: "/admin/listings?status=pending_review",
        items: (pendingListingQueue ?? []).map((item) => ({
          id: item.id,
          label: item.title ?? "Untitled listing",
          meta: [item.town, item.county].filter(Boolean).join(", ") || "Location not set",
          href: `/admin/listings/${item.id}`,
        })),
      },
      {
        id: "bookings",
        title: "Booking confirmation",
        count: pendingBookingCount ?? 0,
        href: "/admin/bookings?status=pending",
        items: (pendingBookingQueue ?? []).map((item) => ({
          id: item.id,
          label: item.guest_name ?? `Booking ${item.id.slice(0, 8)}`,
          meta: `Received ${new Date(item.created_at).toLocaleDateString("en-KE")}`,
          href: `/admin/bookings/${item.id}`,
        })),
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
            ? `Submitted ${new Date(item.kyc_submitted_at).toLocaleDateString("en-KE")}`
            : "Submission date unavailable",
          href: "/admin/verification",
        })),
      },
      {
        id: "support",
        title: "Open support cases",
        count: openSupportCount ?? 0,
        href: "/admin/support?status=all",
        items: (openSupportQueue ?? []).map((item) => ({
          id: item.id,
          label: item.subject,
          meta: `${item.status.replaceAll("_", " ")} · ${new Date(item.created_at).toLocaleDateString("en-KE")}`,
          href: "/admin/support?status=all",
        })),
      },
      {
        id: "payouts",
        title: "Payouts owed",
        count: owedPayoutCount ?? 0,
        href: "/admin/payouts?view=payouts&status=owed",
        items: (owedPayoutQueue ?? []).map((item) => ({
          id: item.id,
          label: `KES ${Number(item.amount).toLocaleString()}`,
          meta: `Owed since ${new Date(item.created_at).toLocaleDateString("en-KE")}`,
          href: "/admin/payouts?view=payouts&status=owed",
        })),
      },
      {
        id: "property-requests",
        title: "Property visit requests",
        count: propertyRequestCount ?? 0,
        href: "/admin/listing-requests?status=all",
        items: (propertyRequestQueue ?? []).map((item) => ({
          id: item.id,
          label: item.proposed_title,
          meta: `${item.property_type} · ${item.town}, ${item.county} · ${new Date(item.created_at).toLocaleDateString("en-KE")}`,
          href: "/admin/listing-requests?status=all",
        })),
      },
    ],
  };
}

function QueuePanel({
  title,
  count,
  href,
  items,
}: {
  title: string;
  count: number;
  href: string;
  items: { id: string; label: string; meta: string; href: string }[];
}) {
  return (
    <section className="min-w-0 border-y bg-white">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-[#1B1A2E]">{title}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{count}</span>
      </header>
      {items.length ? (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="block px-4 py-3 hover:bg-gray-50">
                <span className="block truncate text-sm font-medium text-[#1B1A2E]">{item.label}</span>
                <span className="mt-1 block truncate text-xs text-gray-500">{item.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-sm text-gray-500">Nothing needs attention.</p>
      )}
      <Link href={href} className="block border-t px-4 py-2.5 text-xs font-semibold text-[#CF2F74] hover:bg-[#FDF0F5]">
        View queue
      </Link>
    </section>
  );
}

function FinanceOverviewCharts({
  financeAttention,
  paymentTrend,
}: {
  financeAttention: {
    refundsAwaitingDecision: number;
    refundsAwaitingProcessing: number;
    failedPayments: number;
    paymentSupportCases: number;
  };
  paymentTrend: Array<{ month: string; paid: number; failed: number }>;
}) {
  const maxCount = Math.max(
    1,
    ...paymentTrend.flatMap((month) => [month.paid, month.failed]),
  );
  const hasPaymentActivity = paymentTrend.some(
    (month) => month.paid > 0 || month.failed > 0,
  );
  const queues = [
    {
      label: "Refunds awaiting decision",
      count: financeAttention.refundsAwaitingDecision,
      href: "/admin/refunds?view=review",
      color: "bg-amber-500",
    },
    {
      label: "Approved refunds to process",
      count: financeAttention.refundsAwaitingProcessing,
      href: "/admin/refunds?view=approved",
      color: "bg-orange-500",
    },
    {
      label: "Failed payments",
      count: financeAttention.failedPayments,
      href: "/admin/payouts?view=payments&status=failed",
      color: "bg-rose-500",
    },
    {
      label: "Guest payment support cases",
      count: financeAttention.paymentSupportCases,
      href: "/admin/support?category=payment_refund&status=open",
      color: "bg-sky-500",
    },
  ];
  const maxQueueCount = Math.max(1, ...queues.map((queue) => queue.count));
  const totalQueueItems = queues.reduce((sum, queue) => sum + queue.count, 0);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-[#E23E85]">
          Payments and refunds
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Recent payment outcomes and finance work that needs attention.
        </p>
      </header>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#1B1A2E]">
                Guest payment outcomes
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Payment records created per month · last 6 months
              </p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-gray-600">
                <span className="size-2.5 rounded-sm bg-emerald-500" />
                Paid
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-600">
                <span className="size-2.5 rounded-sm bg-rose-400" />
                Failed
              </span>
            </div>
          </header>
          <div
            role="img"
            aria-label={`Monthly guest payment records: ${paymentTrend.map((month) => `${month.month}, ${month.paid} paid, ${month.failed} failed`).join("; ")}`}
            className="mt-5"
          >
            {!hasPaymentActivity && (
              <p className="mb-3 text-center text-xs text-gray-500">
                No paid or failed payments were recorded in this period.
              </p>
            )}
            <div className="grid h-44 grid-cols-6 items-end gap-2 border-b border-gray-200 px-1 sm:gap-4">
              {paymentTrend.map((month) => (
                <div
                  key={month.month}
                  className="flex h-full min-w-0 flex-col justify-end"
                >
                  <div className="mb-1 flex h-5 items-center justify-center gap-1 text-[10px] tabular-nums text-gray-500">
                    <span>{month.paid || ""}</span>
                    <span>{month.failed || ""}</span>
                  </div>
                  <div className="flex h-[calc(100%-1.5rem)] items-end justify-center gap-1">
                    <div
                      title={`${month.month}: ${month.paid} paid`}
                      className="w-7 rounded-t-sm bg-emerald-500"
                      style={{
                        height: `${(month.paid / maxCount) * 100}%`,
                      }}
                    />
                    <div
                      title={`${month.month}: ${month.failed} failed`}
                      className="w-7 rounded-t-sm bg-rose-400"
                      style={{
                        height: `${(month.failed / maxCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="mt-2 text-center text-[11px] font-medium text-gray-500">
                    {month.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            The current month is partial. Counts reflect payment records, not
            transaction value.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <header>
            <h3 className="font-semibold text-[#1B1A2E]">
              Finance action queues
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {totalQueueItems} outstanding items across these queues
            </p>
          </header>
          <div className="mt-5 space-y-4">
            {queues.map((queue) => (
              <Link
                key={queue.label}
                href={queue.href}
                aria-label={`${queue.label}: ${queue.count}. Open queue`}
                className="group block rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CF2F74]"
              >
                <span className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-gray-700 group-hover:text-[#CF2F74]">
                    {queue.label}
                  </span>
                  <span className="font-semibold tabular-nums text-gray-900">
                    {queue.count}
                  </span>
                </span>
                <span className="block h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <span
                    className={`block h-full rounded-full ${queue.color}`}
                    style={{
                      width: `${queue.count > 0 ? Math.max(4, (queue.count / maxQueueCount) * 100) : 0}%`,
                    }}
                  />
                </span>
              </Link>
            ))}
          </div>
          {totalQueueItems === 0 && (
            <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              No finance items are currently waiting in these queues.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Dashboard</h1>
        <p className="text-sm text-gray-600">
          Key operational queues, payment outcomes, and guest finance issues.
        </p>
      </div>

      <FinanceOverviewCharts
        financeAttention={stats.financeAttention}
        paymentTrend={stats.paymentTrend}
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#E23E85]">Work queues</h2>
            <p className="mt-1 text-sm text-gray-600">Oldest outstanding items are shown first.</p>
          </div>
          <Link href="/admin/audit-log" className="text-sm font-medium text-[#CF2F74] hover:underline">View audit log</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {stats.workQueues.map((queue) => (
            <QueuePanel key={queue.id} {...queue} />
          ))}
        </div>
      </section>

    </div>
  );
}