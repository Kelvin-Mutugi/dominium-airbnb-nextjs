import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHostListingData } from "@/app/lib/host/actions";

type ListingImage = {
  id: string;
  url: string | null;
  sort_order: number;
};

type HostListingDetail = {
  id: string;
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
  check_in_time: string | null;
  check_out_time: string | null;
  min_nights: number | null;
  cancellation_policy: string | null;
  instant_book: boolean | null;
  is_publish_ready: boolean | null;
  created_at: string | null;
  updated_at: string | null;
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
      <dd className="mt-1 whitespace-pre-wrap text-sm text-[#1B1A2E]">{displayValue(value)}</dd>
    </div>
  );
}

export default async function HostListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let listing: HostListingDetail;

  try {
    listing = (await getHostListingData(id)) as HostListingDetail;
  } catch (error) {
    console.error("Failed to load host listing detail:", error);
    notFound();
  }

  const images = [...(listing.listing_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/host/listings" className="text-sm text-gray-500 hover:text-gray-900">
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
            <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
              {image.url && (
                <Image
                  src={image.url}
                  alt={listing.title ?? "Listing image"}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="h-full w-full object-cover"
                />
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
          <DetailField label="Instant book" value={listing.instant_book} />
          <DetailField label="Publish ready" value={listing.is_publish_ready} />
          <DetailField label="Created" value={formatDate(listing.created_at)} />
          <DetailField label="Last updated" value={formatDate(listing.updated_at)} />
        </dl>
      </section>

      <section className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1A2E]">Policies</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <DetailField label="Cancellation policy" value={listing.cancellation_policy} />
        </dl>
      </section>
    </div>
  );
}
