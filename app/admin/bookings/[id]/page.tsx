import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { BookingRowActions } from "@/components/admin/bookings/booking-row-actions";

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
  listing_id: string | null;
  guest_id: string | null;
  host_id: string | null;
  check_in: string | null;
  check_out: string | null;
  guests_count: number | null;
  children_count: number | null;
  rooms_count: number | null;
  status: string | null;
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

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/bookings" className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to bookings
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-[#1B1A2E]">Booking details</h1>
          <p className="mt-1 text-sm text-gray-500">Booking ID: {booking.id}</p>
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
          <DetailField label="Rooms" value={booking.rooms_count} />
          <DetailField label="Guest name" value={booking.guest_name ?? guest?.full_name} />
          <DetailField label="Guest email" value={booking.guest_email} />
          <DetailField label="Guest phone" value={booking.guest_phone ?? guest?.phone} />
          <DetailField label="Special requests" value={booking.special_requests} />
        </dl>
      </section>

      <section className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1A2E]">Financial details</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Total amount" value={amount(booking.total_amount)} />
          <DetailField label="Commission" value={amount(booking.commission_amount)} />
          <DetailField label="Host payout" value={amount(booking.host_payout_amount)} />
        </dl>
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
            <Link
              href={`/admin/users/${booking.guest_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block text-sm font-medium text-[#E23E85] hover:underline"
            >
              Open guest profile
            </Link>
          )}
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
            <Link
              href={`/admin/users/${booking.host_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block text-sm font-medium text-[#E23E85] hover:underline"
            >
              Open host profile
            </Link>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1A2E]">Record metadata</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <DetailField label="Created" value={formatDate(booking.created_at)} />
          <DetailField label="Last updated" value={formatDate(booking.updated_at)} />
        </dl>
        {booking.listing_id && (
          <Link
            href={`/admin/listings/${booking.listing_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block text-sm font-medium text-[#E23E85] hover:underline"
          >
            Open listing details
          </Link>
        )}
      </section>
    </div>
  );
}