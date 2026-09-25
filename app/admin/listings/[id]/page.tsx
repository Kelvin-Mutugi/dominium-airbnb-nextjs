import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

type ListingImage = {
  id: string;
  url: string | null;
  sort_order: number;
};

type ListingProfile = {
  full_name?: string | null;
  business_name?: string | null;
};

type Listing = {
  id: string;
  host_id: string;
  title: string | null;
  description: string | null;
  county: string | null;
  town: string | null;
  address: string | null;
  price_per_night: number | string | null;
  max_guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: unknown;
  features: unknown;
  house_rules: unknown;
  status: string | null;
  slug: string | null;
  latitude: number | null;
  longitude: number | null;
  check_in_time: string | null;
  check_out_time: string | null;
  min_nights: number | null;
  service_fee_percent: number | string | null;
  cancellation_policy: string | null;
  booking_terms: string | null;
  refund_policy: string | null;
  is_rare_find: boolean | null;
  rare_find_note: string | null;
  average_rating: number | string | null;
  review_count: number | null;
  is_feartured: boolean | null;
  instant_book: boolean | null;
  is_publish_ready: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  profiles: ListingProfile | ListingProfile[] | null;
  listing_images: ListingImage[] | null;
};

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  return String(value);
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("en-KE") : "Not provided";
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-[#1B1A2E] whitespace-pre-wrap">{displayValue(value)}</dd>
    </div>
  );
}

export default async function AdminListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("listings")
    .select("*, profiles:host_id ( full_name, business_name ), listing_images ( id, url, sort_order )")
    .eq("id", id)
    .order("sort_order", { foreignTable: "listing_images", ascending: true })
    .maybeSingle();

  if (error || !data) notFound();

  const listing = data as Listing;
  const profile = Array.isArray(listing.profiles)
    ? listing.profiles[0] ?? null
    : listing.profiles;
  const images = [...(listing.listing_images ?? [])].sort(
    (first, second) => first.sort_order - second.sort_order,
  );

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/listings" className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to listings
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-[#1B1A2E]">{displayValue(listing.title)}</h1>
          <p className="mt-1 text-sm text-gray-500">Listing ID: {listing.id}</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium capitalize text-gray-700">
          {displayValue(listing.status).replaceAll("_", " ")}
        </span>
      </div>

      {images.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {images.map((image) => (
            <div key={image.id} className="aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
              {image.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt={listing.title ?? "Listing"} className="h-full w-full object-cover" />
              )}
            </div>
          ))}
        </div>
      )}

      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1A2E]">Listing details</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Description" value={listing.description} />
          <DetailField label="County" value={listing.county} />
          <DetailField label="Town" value={listing.town} />
          <DetailField label="Address" value={listing.address} />
          <DetailField label="Price per night" value={listing.price_per_night == null ? null : `KES ${Number(listing.price_per_night).toLocaleString()}`} />
          <DetailField label="Maximum guests" value={listing.max_guests} />
          <DetailField label="Bedrooms" value={listing.bedrooms} />
          <DetailField label="Bathrooms" value={listing.bathrooms} />
          <DetailField label="Amenities" value={listing.amenities} />
          <DetailField label="Features" value={listing.features} />
          <DetailField label="House rules" value={listing.house_rules} />
          <DetailField label="Check-in time" value={listing.check_in_time} />
          <DetailField label="Check-out time" value={listing.check_out_time} />
          <DetailField label="Minimum nights" value={listing.min_nights} />
          <DetailField label="Service fee" value={listing.service_fee_percent == null ? null : `${listing.service_fee_percent}%`} />
          <DetailField label="Instant book" value={listing.instant_book} />
          <DetailField label="Publish ready" value={listing.is_publish_ready} />
          <DetailField label="Rare find" value={listing.is_rare_find} />
          <DetailField label="Rare find note" value={listing.rare_find_note} />
          <DetailField label="Featured" value={listing.is_feartured} />
          <DetailField label="Average rating" value={listing.average_rating} />
          <DetailField label="Review count" value={listing.review_count} />
          <DetailField label="Latitude" value={listing.latitude} />
          <DetailField label="Longitude" value={listing.longitude} />
          <DetailField label="Slug" value={listing.slug} />
          <DetailField label="Created" value={formatDate(listing.created_at)} />
          <DetailField label="Last updated" value={formatDate(listing.updated_at)} />
        </dl>
      </section>

      <section className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1A2E]">Host</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Name" value={profile?.full_name} />
          <DetailField label="Business" value={profile?.business_name} />
          <DetailField label="Host ID" value={listing.host_id} />
        </dl>
      </section>

      <section className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1A2E]">Booking and policy terms</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <DetailField label="Booking terms" value={listing.booking_terms} />
          <DetailField label="Cancellation policy" value={listing.cancellation_policy} />
          <DetailField label="Refund policy" value={listing.refund_policy} />
        </dl>
      </section>
    </div>
  );
}