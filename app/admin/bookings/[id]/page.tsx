import Link from "next/link";
import { notFound } from "next/navigation";
import { humanize } from "@/app/lib/format";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { BookingRowActions } from "@/components/admin/bookings/booking-row-actions";
import { openCustomerSupportThreadForBooking } from "@/app/customer-support/actions";

type RelatedRecord = {
  id?: string;
  title?: string | null;
  town?: string | null;
  county?: string | null;
  full_name?: string | null;
  business_name?: string | null;
  phone?: string | null;
};

type Booking = {
  id: string;
  booking_reference: string;
  listing_id: string | null;
  guest_id: string | null;
  host_id: string | null;
  check_in: string | null;
  check_out: string | null;
  guests_count: number | null;
  children_count: number | null;
  pets_count: number | null;
  rooms_count: number | null;
  status: string | null;
  completed_at: string | null;
  completion_source: "host" | "system" | null;
  total_amount: number | string | null;
  commission_amount: number | string | null;
  host_payout_amount: number | string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  special_requests: string | null;
  created_at: string | null;
  updated_at: string | null;
  listing: RelatedRecord | RelatedRecord[] | null;
  guest: RelatedRecord | RelatedRecord[] | null;
  host: RelatedRecord | RelatedRecord[] | null;
};

type DateChangeRequest = {
  id: string;
  current_check_in: string;
  current_check_out: string;
  requested_check_in: string;
  requested_check_out: string;
  quoted_total_amount: number | string | null;
  status: string;
  reason: string | null;
  host_response: string | null;
  created_at: string;
  responded_at: string | null;
};

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function amount(value: number | string | null) {
  return value == null ? "Not provided" : `KES ${Number(value).toLocaleString()}`;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("en-KE") : "Not provided";
}

function one(value: RelatedRecord | RelatedRecord[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-[#1B1A2E]">{displayValue(value)}</dd>
    </div>
  );
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("bookings")
    .select(
      `*,
       listing:listing_id ( id, title, town, county ),
       guest:guest_id ( id, full_name, phone ),
       host:host_id ( id, full_name, business_name, phone )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const booking = data as Booking;
  const listing = one(booking.listing);
  const guest = one(booking.guest);
  const host = one(booking.host);
  const [{ count: paymentCount }, { count: payoutCount }, dateChangeResult] = await Promise.all([
    admin.from("payments").select("id", { count: "exact", head: true }).eq("booking_id", booking.id),
    admin.from("payouts").select("id", { count: "exact", head: true }).eq("booking_id", booking.id),
    admin
      .from("booking_change_requests")
      .select("id, current_check_in, current_check_out, requested_check_in, requested_check_out, quoted_total_amount, status, reason, host_response, created_at, responded_at")
      .eq("booking_id", booking.id)
      .eq("request_type", "date_change")
      .order("created_at", { ascending: false }),
  ]);
  if (dateChangeResult.error) throw new Error("Unable to load booking date-change history.");
  const dateChanges = (dateChangeResult.data ?? []) as DateChangeRequest[];

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/bookings" className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to bookings
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-[#1B1A2E]">Booking details</h1>
          <p className="mt-1 text-sm text-gray-500">Booking reference: {booking.booking_reference}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium capitalize text-gray-700">
            {displayValue(booking.status)}
          </span>
          <BookingRowActions bookingId={booking.id} status={booking.status ?? ""} />
        </div>
      </div>

      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1A2E]">Stay and guest details</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Listing" value={listing?.title} />
          <DetailField label="Location" value={[listing?.town, listing?.county].filter(Boolean).join(", ")} />
          <DetailField label="Check-in" value={booking.check_in} />
          <DetailField label="Check-out" value={booking.check_out} />
          <DetailField label="Guests" value={booking.guests_count} />
          <DetailField label="Children" value={booking.children_count} />
          <DetailField label="Pets" value={booking.pets_count} />
          <DetailField label="Rooms" value={booking.rooms_count} />
          <DetailField label="Guest name" value={booking.guest_name ?? guest?.full_name} />
          <DetailField label="Guest email" value={booking.guest_email} />
          <DetailField label="Guest phone" value={booking.guest_phone ?? guest?.phone} />
          <DetailField label="Special requests" value={booking.special_requests} />
        </dl>
        {booking.listing_id && (
          <Link href={`/admin/listings/${booking.listing_id}`} className="mt-5 inline-block text-sm font-medium text-[#E23E85] hover:underline">
            Open listing details →
          </Link>
        )}
      </section>

      <section className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1A2E]">Date-change history</h2>
        {dateChanges.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No date-change requests recorded for this booking.</p>
        ) : (
          <ol className="mt-4 divide-y divide-gray-100">
            {dateChanges.map((request) => (
              <li key={request.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${request.status === "approved" ? "bg-[#FCE8F0] text-[#9C2454]" : request.status === "pending" ? "bg-amber-50 text-amber-800" : "bg-gray-100 text-gray-600"}`}>
                    {request.status === "approved" ? "Dates updated" : request.status}
                  </span>
                  <span className="text-xs text-gray-500">Requested {formatDate(request.created_at)}</span>
                  {request.responded_at && <span className="text-xs text-gray-500">· Decided {formatDate(request.responded_at)}</span>}
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">{request.current_check_in} → {request.current_check_out}</span>
                  <span className="px-2" aria-hidden="true">→</span>
                  <span className={`font-semibold ${request.status === "approved" ? "text-[#9C2454]" : "text-[#1B1A2E]"}`}>
                    {request.requested_check_in} → {request.requested_check_out}
                  </span>
                </p>
                {request.quoted_total_amount != null && (
                  <p className="mt-1 text-xs text-gray-500">Quoted total: {amount(request.quoted_total_amount)}</p>
                )}
                {request.reason && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-500">Guest note: {request.reason}</p>}
                {request.host_response && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-500">Host response: {request.host_response}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1A2E]">Financial details</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Total amount" value={amount(booking.total_amount)} />
          <DetailField label="Commission" value={amount(booking.commission_amount)} />
          <DetailField label="Host payout" value={amount(booking.host_payout_amount)} />
        </dl>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={`/admin/payouts?view=payments&bookingId=${booking.id}`} className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-[#1B1A2E] hover:border-[#E23E85] hover:text-[#CF2F74]">
            Payment records ({paymentCount ?? 0})
          </Link>
          <Link href={`/admin/payouts?view=payouts&bookingId=${booking.id}`} className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-[#1B1A2E] hover:border-[#E23E85] hover:text-[#CF2F74]">
            Payout records ({payoutCount ?? 0})
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1B1A2E]">Guest</h2>
          <dl className="mt-5 grid gap-5">
            <DetailField label="Name" value={guest?.full_name ?? booking.guest_name} />
            <DetailField label="Phone" value={guest?.phone ?? booking.guest_phone} />
            <DetailField label="User ID" value={booking.guest_id} />
          </dl>
          {booking.guest_id && (
            <div className="mt-5 flex flex-wrap gap-4">
              <Link
                href={`/admin/users/${booking.guest_id}`}
                className="inline-flex min-h-10 items-center rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-[#1B1A2E] hover:border-[#E23E85] hover:text-[#CF2F74]"
              >
                Open guest profile
              </Link>
              <form action={openCustomerSupportThreadForBooking.bind(null, booking.id, "guest")}>
                <button type="submit" className="inline-flex min-h-10 items-center rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white hover:bg-[#302F43]">
                  Chat with guest
                </button>
              </form>
            </div>
          )}
          {!booking.guest_id && <p className="mt-4 text-sm text-gray-500">Guest checkout has no account for in-app chat.</p>}
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1B1A2E]">Host</h2>
          <dl className="mt-5 grid gap-5">
            <DetailField label="Name" value={host?.full_name} />
            <DetailField label="Business" value={host?.business_name} />
            <DetailField label="Phone" value={host?.phone} />
            <DetailField label="User ID" value={booking.host_id} />
          </dl>
          {booking.host_id && (
            <div className="mt-5 flex flex-wrap gap-4">
              <Link
                href={`/admin/users/${booking.host_id}`}
                className="inline-flex min-h-10 items-center rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-[#1B1A2E] hover:border-[#E23E85] hover:text-[#CF2F74]"
              >
                Open host profile
              </Link>
              <form action={openCustomerSupportThreadForBooking.bind(null, booking.id, "host")}>
                <button type="submit" className="inline-flex min-h-10 items-center rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white hover:bg-[#302F43]">
                  Chat with host
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1A2E]">Record metadata</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <DetailField label="Created" value={formatDate(booking.created_at)} />
          <DetailField label="Last updated" value={formatDate(booking.updated_at)} />
          {booking.status === "completed" && (
            <>
              <DetailField label="Completed at" value={formatDate(booking.completed_at)} />
              <DetailField label="Completion source" value={booking.completion_source ? humanize(booking.completion_source) : null} />
            </>
          )}
        </dl>
        {booking.listing_id && (
          <Link
            href={`/admin/listings/${booking.listing_id}`}
            className="mt-5 inline-block text-sm font-medium text-[#E23E85] hover:underline"
          >
            Open listing details
          </Link>
        )}
      </section>
    </div>
  );
}