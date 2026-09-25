import Link from "next/link";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { formatDate, formatMoney, humanize } from "@/app/lib/format";

type View = "payments" | "payouts";

type PaymentRecord = {
  id: string;
  booking_id: string;
  amount: number | string;
  currency: string | null;
  status: string;
  method: string | null;
  payment_channel: string | null;
  provider: string | null;
  provider_reference: string | null;
  paid_at: string | null;
  created_at: string;
};

type PayoutRecord = {
  id: string;
  host_id: string;
  booking_id: string;
  amount: number | string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

type BookingRecord = {
  id: string;
  listing_id: string;
  guest_id: string | null;
  host_id: string;
  guest_name: string | null;
  guest_email: string | null;
  check_in: string;
  check_out: string;
};

type ProfileRecord = {
  id: string;
  full_name: string | null;
  business_name?: string | null;
  payout_method?: string | null;
  payout_details?: Record<string, string> | null;
};

type LedgerRecord = {
  id: string;
  bookingId: string;
  amount: number | string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  listingTitle: string | null;
  checkIn: string | null;
  checkOut: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  provider?: string | null;
  reference?: string | null;
  method?: string | null;
  currency?: string | null;
  hostName?: string | null;
  payoutDestination?: string | null;
};

const PAYMENT_STATUSES = ["all", "pending", "paid", "failed", "refunded"];
const PAYOUT_STATUSES = ["all", "owed", "processing", "paid"];

function maskedAccount(value: string | undefined) {
  const digits = value?.replace(/\s/g, "") ?? "";
  return digits ? `•••• ${digits.slice(-4)}` : "Details not set";
}

function payoutDestination(profile: ProfileRecord | undefined) {
  if (!profile?.payout_method) return "Method not set";
  const details = profile.payout_details ?? {};
  const method = profile.payout_method.toLowerCase();

  if (method === "mpesa") return `M-Pesa ${maskedAccount(details.phone)}`;
  if (method === "bank") {
    const bank = details.bank_name ? `${details.bank_name} · ` : "Bank · ";
    return `${bank}${maskedAccount(details.account_number)}`;
  }
  return humanize(profile.payout_method);
}

function statusStyle(status: string) {
  switch (status.toLowerCase()) {
    case "paid":
    case "success":
      return "bg-emerald-50 text-emerald-700";
    case "pending":
    case "owed":
    case "processing":
      return "bg-amber-50 text-amber-700";
    case "failed":
    case "refunded":
    case "cancelled":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function makeHref(view: View, status: string, query: string) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (status !== "all") params.set("status", status);
  if (query) params.set("q", query);
  return `/admin/payouts?${params.toString()}`;
}

function matchesQuery(record: LedgerRecord, query: string) {
  if (!query) return true;
  const haystack = [
    record.id,
    record.bookingId,
    record.listingTitle,
    record.guestName,
    record.guestEmail,
    record.hostName,
    record.provider,
    record.reference,
    record.method,
    record.payoutDestination,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function SummaryItem({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="px-5 py-4 first:pl-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-[#1B1A2E]">{formatMoney(amount)}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(status)}`}>
      {humanize(status)}
    </span>
  );
}

export default async function AdminPaymentsPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const view: View = params.view === "payouts" ? "payouts" : "payments";
  const allowedStatuses = view === "payments" ? PAYMENT_STATUSES : PAYOUT_STATUSES;
  const status = allowedStatuses.includes(params.status ?? "all") ? params.status ?? "all" : "all";
  const query = (params.q ?? "").trim().slice(0, 100);
  const admin = getSupabaseAdmin();

  let records: LedgerRecord[];
  if (view === "payments") {
    const { data, error } = await admin
      .from("payments")
      .select("id, booking_id, amount, currency, status, method, payment_channel, provider, provider_reference, paid_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Unable to load payment records.");

    const payments = (data ?? []) as unknown as PaymentRecord[];
    const bookingIds = [...new Set(payments.map((payment) => payment.booking_id).filter(Boolean))];
    const { data: bookingData, error: bookingError } = bookingIds.length
      ? await admin
          .from("bookings")
          .select("id, listing_id, guest_id, host_id, guest_name, guest_email, check_in, check_out")
          .in("id", bookingIds)
      : { data: [], error: null };
    if (bookingError) throw new Error("Unable to load payment booking details.");

    const bookings = (bookingData ?? []) as unknown as BookingRecord[];
    const listingIds = [...new Set(bookings.map((booking) => booking.listing_id).filter(Boolean))];
    const guestIds = [...new Set(bookings.map((booking) => booking.guest_id).filter(Boolean))];
    const [listingResult, guestResult] = await Promise.all([
      listingIds.length
        ? admin.from("listings").select("id, title").in("id", listingIds)
        : Promise.resolve({ data: [], error: null }),
      guestIds.length
        ? admin.from("profiles").select("id, full_name").in("id", guestIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (listingResult.error || guestResult.error) throw new Error("Unable to load payment names.");

    const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
    const listingById = new Map((listingResult.data ?? []).map((listing) => [listing.id, listing.title]));
    const guestById = new Map((guestResult.data ?? []).map((guest) => [guest.id, guest.full_name]));
    records = payments.map((payment) => {
      const booking = bookingById.get(payment.booking_id);
      return {
        id: payment.id,
        bookingId: payment.booking_id,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.created_at,
        paidAt: payment.paid_at,
        listingTitle: booking ? listingById.get(booking.listing_id) ?? null : null,
        checkIn: booking?.check_in ?? null,
        checkOut: booking?.check_out ?? null,
        guestName: booking?.guest_name ?? (booking?.guest_id ? guestById.get(booking.guest_id) : null),
        guestEmail: booking?.guest_email ?? null,
        provider: payment.provider,
        reference: payment.provider_reference,
        method: payment.payment_channel ?? payment.method,
        currency: payment.currency,
      };
    });
  } else {
    const { data, error } = await admin
      .from("payouts")
      .select("id, host_id, booking_id, amount, status, paid_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Unable to load payout records.");

    const payouts = (data ?? []) as unknown as PayoutRecord[];
    const bookingIds = [...new Set(payouts.map((payout) => payout.booking_id).filter(Boolean))];
    const hostIds = [...new Set(payouts.map((payout) => payout.host_id).filter(Boolean))];
    const [{ data: bookingData, error: bookingError }, { data: profileData, error: profileError }] = await Promise.all([
      bookingIds.length
        ? admin
            .from("bookings")
            .select("id, listing_id, guest_id, host_id, guest_name, guest_email, check_in, check_out")
            .in("id", bookingIds)
        : Promise.resolve({ data: [], error: null }),
      hostIds.length
        ? admin
            .from("profiles")
            .select("id, full_name, business_name, payout_method, payout_details")
            .in("id", hostIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (bookingError || profileError) throw new Error("Unable to load payout details.");

    const bookings = (bookingData ?? []) as unknown as BookingRecord[];
    const profiles = (profileData ?? []) as unknown as ProfileRecord[];
    const listingIds = [...new Set(bookings.map((booking) => booking.listing_id).filter(Boolean))];
    const { data: listingData, error: listingError } = listingIds.length
      ? await admin.from("listings").select("id, title").in("id", listingIds)
      : { data: [], error: null };
    if (listingError) throw new Error("Unable to load payout listing names.");

    const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const listingById = new Map((listingData ?? []).map((listing) => [listing.id, listing.title]));
    records = payouts.map((payout) => {
      const booking = bookingById.get(payout.booking_id);
      const host = profileById.get(payout.host_id);
      return {
        id: payout.id,
        bookingId: payout.booking_id,
        amount: payout.amount,
        status: payout.status,
        createdAt: payout.created_at,
        paidAt: payout.paid_at,
        listingTitle: booking ? listingById.get(booking.listing_id) ?? null : null,
        checkIn: booking?.check_in ?? null,
        checkOut: booking?.check_out ?? null,
        hostName: host?.business_name ?? host?.full_name ?? null,
        payoutDestination: payoutDestination(host),
      };
    });
  }

  const filteredRecords = records.filter((record) => {
    const matchesStatus =
      status === "all" ||
      (status === "paid" && view === "payments"
        ? record.status === "paid" || record.status === "success"
        : record.status === status);
    return matchesStatus && matchesQuery(record, query);
  });
  const sumStatus = (statuses: string[]) =>
    records
      .filter((record) => statuses.includes(record.status))
      .reduce((sum, record) => sum + Number(record.amount), 0);
  const viewTabs: { value: View; label: string }[] = [
    { value: "payments", label: "Payments" },
    { value: "payouts", label: "Payouts" },
  ];
  const statuses = view === "payments" ? PAYMENT_STATUSES : PAYOUT_STATUSES;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Payments &amp; Payouts</h1>
        <p className="mt-1 text-sm text-gray-600">Review payment activity and host balances. Showing the latest 100 records.</p>
      </header>

      <dl className="grid grid-cols-1 divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {view === "payments" ? (
          <>
            <SummaryItem label="Collected in latest 100" amount={sumStatus(["paid", "success"])} />
            <SummaryItem label="Awaiting payment" amount={sumStatus(["pending"])} />
            <SummaryItem label="Failed or refunded" amount={sumStatus(["failed", "refunded"])} />
          </>
        ) : (
          <>
            <SummaryItem label="Owed in latest 100" amount={sumStatus(["owed"])} />
            <SummaryItem label="Processing" amount={sumStatus(["processing"])} />
            <SummaryItem label="Paid in latest 100" amount={sumStatus(["paid"])} />
          </>
        )}
      </dl>

      <nav aria-label="Ledger type" className="flex gap-6 border-b">
        {viewTabs.map((tab) => (
          <Link
            key={tab.value}
            href={makeHref(tab.value, "all", "")}
            aria-current={view === tab.value ? "page" : undefined}
            className={`border-b-2 px-1 py-3 text-sm font-medium ${
              view === tab.value
                ? "border-[#E23E85] text-[#1B1A2E]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Record status" className="flex flex-wrap gap-1">
          {statuses.map((item) => (
            <Link
              key={item}
              href={makeHref(view, item, query)}
              aria-current={status === item ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm ${
                status === item
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item === "all" ? "All" : humanize(item)}
            </Link>
          ))}
        </nav>

        <form action="/admin/payouts" className="flex w-full max-w-md gap-2">
          <input type="hidden" name="view" value={view} />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <label className="sr-only" htmlFor="ledger-search">Search ledger</label>
          <input
            id="ledger-search"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={100}
            placeholder={view === "payments" ? "Search reference, guest, listing…" : "Search host, booking, listing…"}
            className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#E23E85] focus:ring-2 focus:ring-[#E23E85]/20"
          />
          <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
            Search
          </button>
          {query && (
            <Link href={makeHref(view, status, "")} className="self-center text-sm text-gray-500 hover:text-gray-900">
              Clear
            </Link>
          )}
        </form>
      </div>

      <p className="text-xs text-gray-500">
        {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"}
        {query ? " match your search" : " shown"} from the latest 100.
      </p>

      <div className="overflow-x-auto border-y bg-white">
        {view === "payments" ? (
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Payment / Booking</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${record.bookingId}`} className="font-medium text-[#1B1A2E] hover:text-[#E23E85]">
                      {record.listingTitle ?? "Listing unavailable"}
                    </Link>
                    <span className="mt-0.5 block text-xs text-gray-500">Booking {record.bookingId.slice(0, 8)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-gray-800">{record.guestName ?? "Guest name unavailable"}</span>
                    {record.guestEmail && <span className="block text-xs text-gray-500">{record.guestEmail}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{humanize(record.provider ?? record.method) || "—"}</td>
                  <td className="max-w-48 truncate px-4 py-3 font-mono text-xs text-gray-500" title={record.reference ?? undefined}>
                    {record.reference ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900">
                    {formatMoney(record.amount, record.currency ?? "KES")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{record.paidAt ? formatDate(record.paidAt, "short") : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">No payments match these filters.</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Payout / Booking</th>
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">Stay</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${record.bookingId}`} className="font-medium text-[#1B1A2E] hover:text-[#E23E85]">
                      {record.listingTitle ?? "Listing unavailable"}
                    </Link>
                    <span className="mt-0.5 block text-xs text-gray-500">Booking {record.bookingId.slice(0, 8)}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-800">{record.hostName ?? "Host name unavailable"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {record.checkIn && record.checkOut ? `${formatDate(record.checkIn, "noYear")} – ${formatDate(record.checkOut, "short")}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{record.payoutDestination}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900">{formatMoney(record.amount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{record.paidAt ? formatDate(record.paidAt, "short") : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">No payouts match these filters.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}