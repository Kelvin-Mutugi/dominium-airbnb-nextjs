import Link from "next/link";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { formatDate, formatMoney, humanize } from "@/app/lib/format";
import { RefundDecisionActions } from "@/components/admin/refunds/refund-decision-actions";
import { PaymentRefundDecisionActions } from "@/components/admin/refunds/payment-refund-decision-actions";

const VIEWS = [
  { value: "review", label: "Needs decision", statuses: ["awaiting_admin_review"] },
  { value: "approved", label: "Approved, not sent", statuses: ["awaiting_manual_processing"] },
  { value: "history", label: "Decided", statuses: ["declined", "processed", "not_eligible"] },
] as const;

type RefundRequest = {
  id: string;
  booking_id: string;
  guest_id: string;
  host_id: string;
  amount_paid: number | string;
  refund_percent: number;
  estimated_refund_amount: number | string;
  reason: string | null;
  created_at: string;
  responded_at: string | null;
  refund_processing_status: string;
  refund_admin_response: string | null;
  refund_decided_at: string | null;
  actual_refund_amount: number | string | null;
  refund_processed_at: string | null;
  refund_transaction_reference: string | null;
};

type Booking = {
  id: string;
  booking_reference: string;
  listing_id: string;
  guest_id: string | null;
  host_id: string;
  guest_name: string | null;
  guest_email: string | null;
  check_in: string;
  check_out: string;
  status: string;
  host_payout_amount: number | string;
};

type Payment = {
  id: string;
  booking_id: string;
  amount: number | string;
  status: string;
  method: string | null;
  payment_channel: string | null;
  provider: string | null;
  provider_reference: string | null;
  paid_at: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
};

type PaymentRefundRequest = {
  id: string;
  payment_id: string;
  booking_id: string;
  guest_id: string | null;
  amount_paid: number | string;
  reason: string;
  status: string;
  admin_response: string | null;
  actual_refund_amount: number | string | null;
  transaction_reference: string | null;
  processed_at: string | null;
  created_at: string;
};

type DarajaRefundAttempt = {
  id: string;
  purpose: string;
  payment_refund_request_id: string | null;
  cancellation_refund_request_id: string | null;
  status: string;
  amount: number | string;
  actual_fee: number | string | null;
  transaction_id: string | null;
};

function oneLine(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const activeView = VIEWS.find((view) => view.value === params.view) ?? VIEWS[0];
  const admin = getSupabaseAdmin();
  const [
    { data, error },
    { data: paymentRefundData, error: paymentRefundError },
  ] = await Promise.all([
    admin
      .from("booking_change_requests")
      .select("id, booking_id, guest_id, host_id, amount_paid, refund_percent, estimated_refund_amount, reason, created_at, responded_at, refund_processing_status, refund_admin_response, refund_decided_at, actual_refund_amount, refund_processed_at, refund_transaction_reference")
      .eq("request_type", "cancellation")
      .eq("status", "approved")
      .in("refund_processing_status", [...activeView.statuses])
      .order("created_at", { ascending: activeView.value === "review" }),
    admin
      .from("payment_refund_requests")
      .select("id, payment_id, booking_id, guest_id, amount_paid, reason, status, admin_response, actual_refund_amount, transaction_reference, processed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (error) throw new Error("Unable to load refund requests.");
  if (paymentRefundError) throw new Error("Unable to load guest payment refund requests. Apply the payment refund request migration and try again.");
  const requests = (data ?? []) as unknown as RefundRequest[];
  const paymentRefundRequests = (paymentRefundData ?? []) as unknown as PaymentRefundRequest[];

  const paymentRefundIds = paymentRefundRequests.map((request) => request.id);
  const cancellationRefundIds = requests.map((request) => request.id);
  const [paymentAttemptsResult, cancellationAttemptsResult] = await Promise.all([
    paymentRefundIds.length
      ? admin.from("daraja_b2c_attempts").select("id, purpose, payment_refund_request_id, cancellation_refund_request_id, status, amount, actual_fee, transaction_id").in("payment_refund_request_id", paymentRefundIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    cancellationRefundIds.length
      ? admin.from("daraja_b2c_attempts").select("id, purpose, payment_refund_request_id, cancellation_refund_request_id, status, amount, actual_fee, transaction_id").in("cancellation_refund_request_id", cancellationRefundIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (paymentAttemptsResult.error || cancellationAttemptsResult.error) {
    throw new Error("Unable to load Safaricom refund transfer states.");
  }
  const latestPaymentAttempt = new Map<string, DarajaRefundAttempt>();
  const latestCancellationAttempt = new Map<string, DarajaRefundAttempt>();
  for (const attempt of (paymentAttemptsResult.data ?? []) as unknown as DarajaRefundAttempt[]) {
    if (attempt.payment_refund_request_id && !latestPaymentAttempt.has(attempt.payment_refund_request_id)) {
      latestPaymentAttempt.set(attempt.payment_refund_request_id, attempt);
    }
  }
  for (const attempt of (cancellationAttemptsResult.data ?? []) as unknown as DarajaRefundAttempt[]) {
    if (attempt.cancellation_refund_request_id && !latestCancellationAttempt.has(attempt.cancellation_refund_request_id)) {
      latestCancellationAttempt.set(attempt.cancellation_refund_request_id, attempt);
    }
  }

  const bookingIds = [...new Set([...requests.map((request) => request.booking_id), ...paymentRefundRequests.map((request) => request.booking_id)])];
  const userIds = [...new Set([...requests.flatMap((request) => [request.guest_id, request.host_id]), ...paymentRefundRequests.map((request) => request.guest_id).filter((id): id is string => Boolean(id))])];
  const listingIds = new Set<string>();
  const [bookingsResult, profilesResult, paymentsResult] = await Promise.all([
    bookingIds.length
      ? admin.from("bookings").select("id, booking_reference, listing_id, guest_id, host_id, guest_name, guest_email, check_in, check_out, status, host_payout_amount").in("id", bookingIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? admin.from("profiles").select("id, full_name, business_name").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    bookingIds.length
      ? admin.from("payments").select("id, booking_id, amount, status, method, payment_channel, provider, provider_reference, paid_at").in("booking_id", bookingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const linkedDataWarnings: string[] = [];
  if (bookingsResult.error) {
    console.error("Unable to load booking details for refund review:", bookingsResult.error);
    linkedDataWarnings.push("Booking details");
  }
  if (profilesResult.error) {
    console.error("Unable to load guest or host profiles for refund review:", profilesResult.error);
    linkedDataWarnings.push("Guest or host details");
  }
  if (paymentsResult.error) {
    console.error("Unable to load payment records for refund review:", paymentsResult.error);
    linkedDataWarnings.push("Payment details");
  }

  const bookings = (bookingsResult.error ? [] : bookingsResult.data ?? []) as unknown as Booking[];
  bookings.forEach((booking) => listingIds.add(booking.listing_id));
  const { data: listingData, error: listingError } = listingIds.size
    ? await admin.from("listings").select("id, title, cancellation_policy, refund_policy").in("id", [...listingIds])
    : { data: [], error: null };
  if (listingError) throw new Error("Unable to load refund policy details.");

  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const profileById = new Map(((profilesResult.error ? [] : profilesResult.data ?? []) as unknown as Profile[]).map((profile) => [profile.id, profile]));
  const listingById = new Map((listingData ?? []).map((listing) => [listing.id, listing]));
  const paymentsByBooking = new Map<string, Payment[]>();
  for (const payment of (paymentsResult.error ? [] : paymentsResult.data ?? []) as unknown as Payment[]) {
    if (!["paid", "success", "refunded"].includes(payment.status)) continue;
    const paymentList = paymentsByBooking.get(payment.booking_id) ?? [];
    paymentList.push(payment);
    paymentsByBooking.set(payment.booking_id, paymentList);
  }

  const counts = await Promise.all(VIEWS.map(async (view) => {
    const { count, error: countError } = await admin
      .from("booking_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("request_type", "cancellation")
      .eq("status", "approved")
      .in("refund_processing_status", [...view.statuses]);
    if (countError) throw new Error("Unable to count refund requests.");
    return [view.value, count ?? 0] as const;
  }));
  const countByView = new Map(counts);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Refunds</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
          Cancellation approval and refund approval are separate decisions. Approved refunds are sent to the guest&apos;s booking M-Pesa number through Safaricom B2C and are marked processed only after the result callback confirms success.
        </p>
      </header>

      {linkedDataWarnings.length > 0 && (
        <p role="status" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Some related {linkedDataWarnings.join(", ").toLowerCase()} could not be loaded. Refund requests remain available for review; missing details are recorded in the server log.
        </p>
      )}

      <nav aria-label="Refund request views" className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {VIEWS.map((view) => (
          <Link
            key={view.value}
            href={`/admin/refunds?view=${view.value}`}
            aria-current={activeView.value === view.value ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${activeView.value === view.value ? "bg-[#1B1A2E] text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            {view.label}<span className="text-xs opacity-75">{countByView.get(view.value) ?? 0}</span>
          </Link>
        ))}
      </nav>

      <section aria-labelledby="payment-refund-requests-heading" className="space-y-3">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 id="payment-refund-requests-heading" className="text-lg font-semibold text-[#1B1A2E]">Guest payment refund requests</h2>
            <p className="mt-1 text-sm text-gray-600">Refund reviews submitted from the guest payment ledger. Approval authorizes a Safaricom B2C transfer; the callback confirms when money is sent.</p>
          </div>
          <span className="text-xs text-gray-500">Latest {paymentRefundRequests.length}</span>
        </header>
        {paymentRefundRequests.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">No guest payment refund requests have been submitted.</p>
        ) : (
          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {paymentRefundRequests.map((request) => {
              const booking = bookingById.get(request.booking_id);
              const listing = booking ? listingById.get(booking.listing_id) : null;
              const guest = request.guest_id ? profileById.get(request.guest_id) : null;
              const payment = (paymentsByBooking.get(request.booking_id) ?? []).find((item) => item.id === request.payment_id);
              return (
                <article key={request.id} className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/bookings/${request.booking_id}`} className="font-semibold text-[#1B1A2E] hover:text-[#CF2F74]">
                        {listing?.title ?? "Listing"} · {booking?.booking_reference ?? request.booking_id.slice(0, 8)}
                      </Link>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${request.status === "awaiting_admin_review" ? "bg-amber-50 text-amber-800" : request.status === "awaiting_manual_processing" ? "bg-sky-50 text-sky-800" : request.status === "processed" ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>
                        {humanize(request.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Guest: {booking?.guest_name ?? guest?.full_name ?? "Guest"}{booking?.guest_email ? ` · ${booking.guest_email}` : ""}
                    </p>
                    <p className="text-sm text-gray-600">
                      Payment: {formatMoney(payment?.amount ?? request.amount_paid)} · {humanize(payment?.provider ?? payment?.payment_channel ?? payment?.method ?? "payment method unavailable")}
                      {payment?.provider_reference ? ` · Ref ${payment.provider_reference}` : ""}
                    </p>
                    <p className="whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm text-gray-700">{request.reason}</p>
                    <p className="text-xs text-gray-500">Requested {formatDate(request.created_at, "long")}</p>
                    {request.admin_response && <p className="text-sm text-gray-600">Decision note: {request.admin_response}</p>}
                    {request.status === "processed" && request.processed_at && (
                      <p className="text-sm text-emerald-800">Refund sent: {formatMoney(request.actual_refund_amount ?? 0)} on {formatDate(request.processed_at)} · Reference {request.transaction_reference}</p>
                    )}
                  </div>
                  <PaymentRefundDecisionActions requestId={request.id} status={request.status} amountPaid={Number(request.amount_paid)} lastAttempt={latestPaymentAttempt.get(request.id) ?? null} />
                </article>
              );
            })}
          </div>
        )}
      </section>

      {requests.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
          No refund requests in this section.
        </p>
      ) : (
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {requests.map((request) => {
            const booking = bookingById.get(request.booking_id);
            const listing = booking ? listingById.get(booking.listing_id) : null;
            const guest = profileById.get(request.guest_id);
            const host = profileById.get(request.host_id);
            const payments = paymentsByBooking.get(request.booking_id) ?? [];
            return (
              <article key={request.id} className="space-y-4 p-4 sm:p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
                  <div className="min-w-0 space-y-4">
                    <section className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/bookings/${request.booking_id}`} className="font-semibold text-[#1B1A2E] hover:text-[#CF2F74]">
                          {listing?.title ?? "Listing"} · {booking?.booking_reference ?? request.booking_id.slice(0, 8)}
                        </Link>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{humanize(request.refund_processing_status)}</span>
                      </div>
                      <p className="text-sm text-gray-600">Stay: {booking?.check_in ?? "Unavailable"} to {booking?.check_out ?? "Unavailable"} · Booking status: {humanize(booking?.status ?? "unknown")}</p>
                      <p className="text-xs text-gray-500">Cancellation approved {request.responded_at ? formatDate(request.responded_at) : formatDate(request.created_at)}</p>
                    </section>

                    <dl className="grid gap-3 rounded-md bg-gray-50 p-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                      <div><dt className="text-xs font-medium uppercase text-gray-500">Guest</dt><dd className="mt-1">{booking?.guest_name ?? guest?.full_name ?? "Guest"}</dd><dd className="text-gray-600">{booking?.guest_email ?? "No email"}</dd></div>
                      <div><dt className="text-xs font-medium uppercase text-gray-500">Host</dt><dd className="mt-1"><Link href={`/admin/users/${request.host_id}`} className="font-medium text-[#9C2454] underline underline-offset-2">{host?.business_name ?? host?.full_name ?? "Host profile"}</Link></dd><dd className="text-gray-600">Host payout on booking: {formatMoney(booking?.host_payout_amount ?? 0)}</dd></div>
                      <div><dt className="text-xs font-medium uppercase text-gray-500">Refund estimate</dt><dd className="mt-1 font-semibold">{formatMoney(request.estimated_refund_amount)}</dd><dd className="text-gray-600">{request.refund_percent}% of {formatMoney(request.amount_paid)} paid</dd></div>
                    </dl>

                    <section className="space-y-1 text-sm">
                      <p className="font-medium text-gray-700">Payment records</p>
                      {payments.length === 0 ? (
                        <p className="text-gray-500">No successful payment record is linked to this booking.</p>
                      ) : (
                        <ul className="space-y-1">
                          {payments.map((payment) => (
                            <li key={payment.id} className="flex flex-wrap gap-x-2 text-gray-600">
                              <span>{formatMoney(payment.amount)}</span><span>·</span><span>{humanize(payment.status)}</span><span>·</span><span>{humanize(payment.payment_channel ?? payment.method ?? "unknown method")}</span><span>·</span><span>{payment.provider ?? "Provider unknown"}</span><span>·</span><span>Ref {payment.provider_reference ?? "not recorded"}</span><span>·</span><span>{payment.paid_at ? formatDate(payment.paid_at) : "Paid date unavailable"}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section className="rounded-md border border-gray-200 p-3 text-sm">
                      <p className="font-medium text-gray-700">Cancellation terms</p>
                      <p className="mt-1 whitespace-pre-wrap text-gray-600">{oneLine(listing?.cancellation_policy ?? listing?.refund_policy)}</p>
                      {request.reason && <p className="mt-2 whitespace-pre-wrap text-gray-600">Guest reason: {request.reason}</p>}
                    </section>

                    {request.refund_admin_response && (
                      <p className="text-sm text-gray-600">Admin decision note: {request.refund_admin_response}</p>
                    )}
                    {request.refund_processed_at && (
                      <p className="text-sm text-emerald-800">Recorded refunded: {formatMoney(request.actual_refund_amount ?? 0)} on {formatDate(request.refund_processed_at)} · Reference {request.refund_transaction_reference}</p>
                    )}
                  </div>

                  <RefundDecisionActions
                    requestId={request.id}
                    status={request.refund_processing_status}
                    estimatedAmount={Number(request.estimated_refund_amount)}
                    maxRefundAmount={Number(request.estimated_refund_amount)}
                    lastAttempt={latestCancellationAttempt.get(request.id) ?? null}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
