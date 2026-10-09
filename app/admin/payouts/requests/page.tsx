import Link from "next/link";
import { requireAdmin } from "@/app/lib/admin-auth";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { formatDate, formatMoney } from "@/app/lib/format";
import { HostPayoutRequestActions } from "@/components/admin/payouts/HostPayoutRequestActions";

type PayoutRequest = {
  id: string;
  host_id: string;
  amount: number | string;
  destination_method: string;
  destination_details: Record<string, string> | null;
  status: string;
  processing_by: string | null;
  transfer_fee: number | string | null;
  net_amount: number | string | null;
  external_reference: string | null;
  last_attempt: {
    id: string;
    status: string;
    amount: number | string;
    estimated_fee: number | string;
    actual_fee: number | string | null;
    transaction_id: string | null;
  } | null;
  last_reversal: {
    id: string;
    status: string;
    amount: number | string;
    actual_fee: number | string | null;
    original_transaction_id: string;
    reason: string;
  } | null;
  requested_at: string;
  processed_at: string | null;
  admin_note: string | null;
};

type HostProfile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  host_fee_balance: number | string | null;
};

export default async function AdminPayoutRequestsPage() {
  const { id: adminId } = await requireAdmin();
  const admin = getSupabaseAdmin();
  const requestFields =
    "id, host_id, amount, destination_method, destination_details, status, processing_by, transfer_fee, net_amount, external_reference, requested_at, processed_at, admin_note, last_attempt:daraja_b2c_attempts!host_payout_requests_last_daraja_attempt_id_fkey(id, status, amount, estimated_fee, actual_fee, transaction_id), last_reversal:daraja_b2c_reversals!host_payout_requests_last_daraja_reversal_id_fkey(id, status, amount, actual_fee, original_transaction_id, reason)";
  const [activeResult, historyResult] = await Promise.all([
    admin
      .from("host_payout_requests")
      .select(requestFields)
      .in("status", ["requested", "processing"])
      .order("requested_at", { ascending: true })
      .limit(100),
    admin
      .from("host_payout_requests")
      .select(requestFields)
      .in("status", ["paid", "reversed", "cancelled"])
      .order("requested_at", { ascending: false })
      .limit(100),
  ]);
  if (activeResult.error || historyResult.error)
    throw new Error("Unable to load host payout requests.");

  const requests = [
    ...((activeResult.data ?? []) as unknown as PayoutRequest[]),
    ...((historyResult.data ?? []) as unknown as PayoutRequest[]),
  ];
  const hostIds = [...new Set(requests.map((request) => request.host_id))];
  const { data: profiles, error: profileError } = hostIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name, business_name, host_fee_balance")
        .in("id", hostIds)
    : { data: [], error: null };
  if (profileError) throw new Error("Unable to load payout request hosts.");
  const profileById = new Map(
    ((profiles ?? []) as unknown as HostProfile[]).map((profile) => [
      profile.id,
      profile,
    ]),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#E23E85]">
            Host withdrawal requests
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
            Verify the reserved amount and M-Pesa destination, then initiate a
            Safaricom B2C transfer. Payouts settle only after Safaricom returns
            a successful result; actual fees are reconciled afterwards.
          </p>
        </div>
        <Link
          href="/admin/payouts?view=payouts"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Booking payout ledger
        </Link>
      </header>

      <p className="border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        Request amounts are host liabilities from the database ledger, not the
        available Safaricom B2C float. Confirm the saved destination and
        estimated fee before sending. Submitted or uncertain transfers remain
        reserved until their Safaricom result is reconciled.
      </p>

      {requests.length === 0 ? (
        <p className="border-y border-gray-200 py-10 text-center text-sm text-gray-500">
          No withdrawal requests yet.
        </p>
      ) : (
        <div className="divide-y divide-gray-200 border-y border-gray-200">
          {requests.map((request) => {
            const host = profileById.get(request.host_id);
            return (
              <article
                key={request.id}
                className="grid gap-4 py-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]"
              >
                <div>
                  <p className="font-semibold text-[#1B1A2E]">
                    {host?.business_name ?? host?.full_name ?? "Host profile"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Request {request.id} ·{" "}
                    {formatDate(request.requested_at, "long")}
                  </p>
                  <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase text-gray-500">
                        Reserved host balance
                      </dt>
                      <dd className="mt-1 font-semibold">
                        {formatMoney(request.amount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-gray-500">
                        Destination method
                      </dt>
                      <dd className="mt-1 capitalize">
                        {request.destination_method === "mpesa"
                          ? "M-Pesa"
                          : "Bank transfer"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-gray-500">
                        Status
                      </dt>
                      <dd className="mt-1 font-medium capitalize">
                        {request.status}
                      </dd>
                    </div>
                    {["paid", "reversed"].includes(request.status) && (
                      <div>
                        <dt className="text-xs uppercase text-gray-500">
                          Transfer fee / net to host
                        </dt>
                        <dd className="mt-1">
                          {formatMoney(request.transfer_fee ?? 0)} /{" "}
                          {formatMoney(request.net_amount ?? 0)}
                        </dd>
                      </div>
                    )}
                    {request.external_reference && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase text-gray-500">
                          Safaricom transaction
                        </dt>
                        <dd className="mt-1 break-all font-mono text-xs">
                          {request.external_reference}
                        </dd>
                      </div>
                    )}
                    {request.processed_at && (
                      <div>
                        <dt className="text-xs uppercase text-gray-500">
                          Processed
                        </dt>
                        <dd className="mt-1">
                          {formatDate(request.processed_at, "long")}
                        </dd>
                      </div>
                    )}
                    {request.admin_note && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase text-gray-500">
                          Admin note
                        </dt>
                        <dd className="mt-1">{request.admin_note}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                {(["requested", "processing"].includes(request.status) ||
                  (request.status === "paid" && request.last_attempt?.status === "succeeded") ||
                  (request.status === "reversed" && request.last_reversal?.status === "reversed" && request.last_reversal.actual_fee == null)) && (
                  <HostPayoutRequestActions
                    requestId={request.id}
                    amount={Number(request.amount)}
                    destinationMethod={request.destination_method}
                    destinationDetails={request.destination_details ?? {}}
                    status={request.status}
                    processingBy={request.processing_by}
                    adminId={adminId}
                    hostFeeBalance={Number(host?.host_fee_balance ?? 0)}
                    lastAttempt={request.last_attempt ?? null}
                    lastReversal={request.last_reversal ?? null}
                  />
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
