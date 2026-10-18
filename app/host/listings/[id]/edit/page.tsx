import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getHostArrivalGuidesData,
  getHostListingChangesData,
  getHostListingData,
  type HostListingChangeRequest,
} from "@/app/lib/host/actions";
import type {
  HostArrivalGuideDetails,
  Listing,
  ListingFormValues,
  ListingImage,
} from "@/app/lib/host/types";
import { LISTING_CATEGORIES } from "@/app/lib/listing-categories";
import ArrivalGuideQuickEdit from "@/components/host/ArrivalGuideQuickEdit";
import { HostListingChangeForm } from "@/components/host/host-listing-change-form";
import { HostListingImages } from "@/components/host/host-listing-images";

type EditableListing = Listing &
  Pick<
    ListingFormValues,
    | "property_type"
    | "categories"
    | "price_per_night"
    | "additional_charges"
    | "max_guests"
    | "bedrooms"
    | "bathrooms"
    | "amenities"
    | "features"
    | "house_rules"
    | "check_in_time"
    | "check_out_time"
    | "min_nights"
    | "instant_book"
  > & { listing_images?: ListingImage[] };

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  county: "County",
  town: "Town",
  address: "Address",
  property_type: "Property type",
  categories: "Categories",
  price_per_night: "Price per night",
  max_guests: "Maximum guests",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  amenities: "Amenities",
  features: "Features",
  house_rules: "House rules",
  check_in_time: "Check-in time",
  check_out_time: "Check-out time",
  min_nights: "Minimum nights",
  instant_book: "Instant book",
  photo_gallery: "Photo gallery",
  arrival_address: "Arrival address",
  arrival_directions: "Directions",
  check_in_instructions: "Check-in instructions",
  wifi_name: "Wi-Fi network",
  wifi_password: "Wi-Fi password",
  arrival_contact: "Arrival contact",
  local_tips: "Local tips",
};

const STATUS_STYLES: Record<
  string,
  { label: string; pill: string; dot: string }
> = {
  pending_review: {
    label: "Waiting for admin review",
    pill: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
  },
  follow_up: {
    label: "Admin follow-up",
    pill: "bg-blue-50 text-blue-800 ring-blue-200",
    dot: "bg-blue-500",
  },
  reviewed: {
    label: "Reviewed",
    pill: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
  },
};

/* Shared look: cream borders, white cards, dark green text, crimson accent */
const CARD =
  "rounded-2xl border border-[#E9E6DD] bg-white shadow-[0_1px_2px_rgba(18,35,29,0.04)]";
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3124a]";

function readableValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "Not set";
  if (field === "photo_gallery") {
    if (!Array.isArray(value) || value.length === 0) return "No photos";
    const descriptions = value.slice(0, 5).map((photo) => {
      if (!photo || typeof photo !== "object") return "Photo";
      const item = photo as Record<string, unknown>;
      const room =
        typeof item.category === "string"
          ? item.category === "bedroom" || item.category === "bathroom"
            ? `${item.category === "bedroom" ? "Bedroom" : "Bathroom"} ${String(item.room_index ?? "")}`.trim()
            : item.category.replaceAll("_", " ")
          : "Photo";
      const caption =
        typeof item.caption === "string" && item.caption.trim()
          ? ` — ${item.caption.trim()}`
          : "";
      return `${item.is_cover ? "Cover: " : ""}${room}${caption}`;
    });
    const remaining =
      value.length > descriptions.length
        ? `; +${value.length - descriptions.length} more`
        : "";
    return `${value.length} ${value.length === 1 ? "photo" : "photos"}: ${descriptions.join("; ")}${remaining}`;
  }
  if (field === "price_per_night") {
    return `KES ${Number(value).toLocaleString("en-KE")}/night`;
  }
  if (field === "instant_book") return value ? "On" : "Off";
  if (field === "additional_charges" && Array.isArray(value)) {
    return value.length
      ? value
          .map((charge) => {
            if (!charge || typeof charge !== "object") return String(charge);
            const item = charge as Record<string, unknown>;
            const frequency =
              item.frequency === "per_night" ? "per night" : "per booking";
            return `${String(item.name)} (KES ${Number(item.amount).toLocaleString("en-KE")} ${frequency})`;
          })
          .join(", ")
      : "None";
  }
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  return String(value);
}

function changedFieldsOf(request: HostListingChangeRequest) {
  return Object.keys(request.after_values).filter(
    (field) =>
      JSON.stringify(request.before_values[field]) !==
      JSON.stringify(request.after_values[field]),
  );
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div id={id} className="scroll-mt-6 px-1">
      <h2 className="text-lg font-semibold text-[#12231d]">{title}</h2>
      <p className="mt-0.5 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.reviewed;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

function SideFact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-[#12231d]">
        {children}
      </dd>
    </div>
  );
}

function ChangeCard({ request }: { request: HostListingChangeRequest }) {
  const changedFields = changedFieldsOf(request);

  return (
    <article className={`p-5 ${CARD}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusPill status={request.status} />
        <time
          dateTime={request.created_at}
          className="text-xs font-medium text-gray-500"
        >
          {new Date(request.created_at).toLocaleDateString("en-KE", {
            dateStyle: "medium",
          })}
        </time>
      </div>

      {changedFields.length > 0 && (
        <ul className="mt-4 divide-y divide-[#F1EFE8]">
          {changedFields.map((field) => (
            <li key={field} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold text-[#12231d]">
                {FIELD_LABELS[field] ?? field}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-[#F7F5EF] px-3 py-2">
                  <p className="text-xs font-medium text-gray-500">Before</p>
                  <p className="mt-0.5 break-words text-sm text-gray-600">
                    {readableValue(field, request.before_values[field])}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 px-3 py-2">
                  <p className="text-xs font-medium text-emerald-700">After</p>
                  <p className="mt-0.5 break-words text-sm font-medium text-emerald-950">
                    {readableValue(field, request.after_values[field])}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {request.host_note && (
        <p className="mt-4 whitespace-pre-wrap rounded-lg border border-[#E9E6DD] px-3 py-2.5 text-sm text-gray-600">
          <span className="font-medium text-[#12231d]">Your note: </span>
          {request.host_note}
        </p>
      )}
      {request.admin_note && (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
          <span className="font-semibold">Message from admin: </span>
          {request.admin_note}
        </p>
      )}
    </article>
  );
}

function ChangeHistory({ requests }: { requests: HostListingChangeRequest[] }) {
  if (!requests.length) return null;

  const visible = requests.slice(0, 3);
  const earlier = requests.slice(3);

  return (
    <section className="space-y-4">
      <SectionHeading
        id="history"
        title="Recent changes"
        description="What you changed, and what the admin team has said about it."
      />
      <div className="space-y-3">
        {visible.map((request) => (
          <ChangeCard key={request.id} request={request} />
        ))}
      </div>
      {earlier.length > 0 && (
        <details className="group">
          <summary
            className={`cursor-pointer list-none rounded-xl border border-[#E9E6DD] bg-white px-4 py-3 text-center text-sm font-semibold text-[#a3124a] transition hover:bg-[#FFF5F8] [&::-webkit-details-marker]:hidden ${FOCUS}`}
          >
            <span className="group-open:hidden">
              Show {earlier.length} earlier{" "}
              {earlier.length === 1 ? "change" : "changes"}
            </span>
            <span className="hidden group-open:inline">Hide earlier changes</span>
          </summary>
          <div className="mt-3 space-y-3">
            {earlier.map((request) => (
              <ChangeCard key={request.id} request={request} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let listing: EditableListing;

  try {
    listing = (await getHostListingData(id)) as EditableListing;
  } catch (error) {
    if (error instanceof Error && error.message === "Listing not found.") {
      notFound();
    }
    throw error;
  }
  const [changeRequests, arrivalGuides] = await Promise.all([
    getHostListingChangesData(id),
    getHostArrivalGuidesData([id]),
  ]);
  const savedGuide = arrivalGuides[id];
  const initialGuide: HostArrivalGuideDetails = {
    arrival_address: savedGuide?.arrival_address ?? listing.address ?? "",
    arrival_directions: savedGuide?.arrival_directions ?? "",
    check_in_instructions: savedGuide?.check_in_instructions ?? "",
    wifi_name: savedGuide?.wifi_name ?? "",
    wifi_password: savedGuide?.wifi_password ?? "",
    arrival_contact: savedGuide?.arrival_contact ?? "",
    local_tips: savedGuide?.local_tips ?? "",
  };

  const initialValues = {
    title: listing.title ?? "",
    description: listing.description ?? "",
    county: listing.county ?? "",
    town: listing.town ?? "",
    address: listing.address ?? "",
    property_type: listing.property_type ?? "",
    categories: Array.isArray(listing.categories) ? listing.categories : [],
    price_per_night: Number(listing.price_per_night ?? 0),
    additional_charges: Array.isArray(listing.additional_charges)
      ? listing.additional_charges.map((charge) => ({
          name: String(charge.name ?? ""),
          amount: Number(charge.amount ?? 0),
          frequency:
            charge.frequency === "per_night" ? ("per_night" as const) : ("per_booking" as const),
          required: charge.required !== false,
        }))
      : [],
    max_guests: Number(listing.max_guests ?? 1),
    bedrooms: Number(listing.bedrooms ?? 0),
    bathrooms: Number(listing.bathrooms ?? 0),
    amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
    features: Array.isArray(listing.features) ? listing.features : [],
    house_rules: Array.isArray(listing.house_rules) ? listing.house_rules : [],
    check_in_time: listing.check_in_time ?? "",
    check_out_time: listing.check_out_time ?? "",
    min_nights: Number(listing.min_nights ?? 1),
    instant_book: listing.instant_book === true,
  };

  const location =
    [initialValues.town, initialValues.county].filter(Boolean).join(", ") ||
    null;
  const rawStatus =
    (listing as unknown as { status?: string | null }).status ?? null;
  const listingStatus = rawStatus
    ? rawStatus.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())
    : null;
  const statusIsGood = rawStatus ? /live|active|publish|approved/i.test(rawStatus) : false;

  const sections = [
    { href: "#photos", label: "Photos" },
    { href: "#arrival-guide", label: "Arrival guide" },
    { href: "#details", label: "Listing details" },
    ...(changeRequests.length
      ? [{ href: "#history", label: "Recent changes" }]
      : []),
  ];

  const savingNote = (
    <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </svg>
      <div className="space-y-1 text-sm leading-6 text-emerald-950">
        <p className="font-semibold">Your changes go live as soon as you save.</p>
        <p className="text-emerald-900/80">
          Keep your listing details up to date so guests know what to expect
          during their stay.
        </p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* Header */}
      <header className="space-y-4">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500"
        >
          <Link href="/host" className="hover:text-gray-900">
            Host portal
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/host/listings" className="hover:text-gray-900">
            My listings
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-gray-700">Edit</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-[#12231d] sm:text-3xl">
              Edit your listing
            </h1>
            <p className="mt-1 truncate text-base text-gray-600">
              {listing.title}
            </p>
          </div>
          <Link
            href={`/host/listings/${id}`}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#E9E6DD] bg-white px-4 py-2.5 text-sm font-semibold text-[#12231d] shadow-[0_1px_2px_rgba(18,35,29,0.04)] transition hover:bg-[#F7F5EF] ${FOCUS}`}
          >
            <span aria-hidden="true">←</span>
            Back to listing
          </Link>
        </div>

        {/* Jump links for phones; large screens use the sidebar */}
        <div className="flex flex-wrap gap-2 lg:hidden">
          {sections.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`rounded-full border border-[#E9E6DD] bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition hover:border-[#a3124a]/40 hover:bg-[#FFF5F8] hover:text-[#a3124a] ${FOCUS}`}
            >
              {link.label}
            </a>
          ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* ============ MAIN COLUMN ============ */}
        <div className="min-w-0 space-y-8">
          {/* Saving note for phones; large screens see it in the sidebar */}
          <aside aria-label="How saving works" className="lg:hidden">
            {savingNote}
          </aside>

          {/* Photos */}
          <section className="space-y-4">
            <SectionHeading
              id="photos"
              title="Photos"
              description="Good photos get more bookings. Add, remove or reorder them here."
            />
            <HostListingImages
              listingId={id}
              bedrooms={initialValues.bedrooms}
              bathrooms={initialValues.bathrooms}
              initialImages={[...(listing.listing_images ?? [])].sort(
                (first, second) =>
                  (first.position ?? first.sort_order) -
                  (second.position ?? second.sort_order),
              )}
            />
          </section>

          {/* Arrival guide */}
          <section className="space-y-4">
            <SectionHeading
              id="arrival-guide"
              title="Arrival guide"
              description="Help guests find your place and check in smoothly. Confirmed guests can view these details in their booking."
            />
            <div className="overflow-hidden rounded-2xl border border-[#E9E6DD] bg-white">
              <ArrivalGuideQuickEdit
                listingId={id}
                initialGuide={initialGuide}
              />
            </div>
          </section>

          {/* Details form */}
          <section className="space-y-4">
            <SectionHeading
              id="details"
              title="Listing details"
              description="Update the description, price, rules and anything else guests see."
            />
            <HostListingChangeForm
              listingId={id}
              expectedUpdatedAt={listing.updated_at}
              initialValues={initialValues}
              categories={LISTING_CATEGORIES}
            />
          </section>

          <ChangeHistory requests={changeRequests} />
        </div>

        {/* ============ SIDEBAR (large screens) ============ */}
        <aside
          aria-label="Listing summary and shortcuts"
          className="hidden space-y-4 lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1"
        >
          {/* Listing snapshot */}
          <section aria-labelledby="listing-snapshot-heading" className={`p-5 ${CARD}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id="listing-snapshot-heading"
                  className="text-base font-semibold leading-snug text-[#12231d]"
                >
                  {listing.title}
                </h2>
                {location && (
                  <p className="mt-0.5 text-sm text-gray-500">{location}</p>
                )}
              </div>
              {listingStatus && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                    statusIsGood
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                      : "bg-gray-50 text-gray-700 ring-gray-200"
                  }`}
                >
                  {listingStatus}
                </span>
              )}
            </div>

            <dl className="mt-4 divide-y divide-[#F1EFE8]">
              <SideFact label="Price per night">
                KES {initialValues.price_per_night.toLocaleString("en-KE")}
              </SideFact>
              <SideFact label="Guests">{initialValues.max_guests}</SideFact>
              <SideFact label="Bedrooms">{initialValues.bedrooms}</SideFact>
              <SideFact label="Bathrooms">{initialValues.bathrooms}</SideFact>
              <SideFact label="Minimum stay">
                {initialValues.min_nights}{" "}
                {initialValues.min_nights === 1 ? "night" : "nights"}
              </SideFact>
              <SideFact label="Check-in">
                {initialValues.check_in_time || "Not set"}
              </SideFact>
              <SideFact label="Check-out">
                {initialValues.check_out_time || "Not set"}
              </SideFact>
              <SideFact label="Instant book">
                {initialValues.instant_book ? "On" : "Off"}
              </SideFact>
            </dl>
            <p className="mt-3 text-xs text-gray-500">
              This is what is saved now. It updates after you save your changes.
            </p>
          </section>

          {/* Section navigation */}
          <nav
            aria-labelledby="on-this-page-heading"
            className={`p-3 ${CARD}`}
          >
            <h2
              id="on-this-page-heading"
              className="px-2 pb-1 pt-1 text-xs font-medium text-gray-500"
            >
              On this page
            </h2>
            <ul>
              {sections.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={`block rounded-lg px-2.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-[#FFF5F8] hover:text-[#a3124a] ${FOCUS}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Saving note */}
          <aside aria-label="How saving works">{savingNote}</aside>

          {/* Recent changes summary */}
          {changeRequests.length > 0 && (
            <section
              aria-labelledby="recent-summary-heading"
              className={`p-5 ${CARD}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="recent-summary-heading"
                  className="text-base font-semibold text-[#12231d]"
                >
                  Recent changes
                </h2>
                <a
                  href="#history"
                  className={`rounded text-xs font-semibold text-[#a3124a] hover:underline ${FOCUS}`}
                >
                  See details
                </a>
              </div>
              <ul className="mt-3 space-y-3">
                {changeRequests.slice(0, 3).map((request) => {
                  const fields = changedFieldsOf(request).map(
                    (field) => FIELD_LABELS[field] ?? field,
                  );
                  return (
                    <li
                      key={request.id}
                      className="rounded-xl bg-[#F7F5EF] px-3.5 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <StatusPill status={request.status} />
                        <time
                          dateTime={request.created_at}
                          className="text-xs text-gray-500"
                        >
                          {new Date(request.created_at).toLocaleDateString(
                            "en-KE",
                            { day: "numeric", month: "short" },
                          )}
                        </time>
                      </div>
                      {fields.length > 0 && (
                        <p className="mt-2 text-xs leading-5 text-gray-600">
                          Changed: {fields.slice(0, 3).join(", ")}
                          {fields.length > 3
                            ? ` and ${fields.length - 3} more`
                            : ""}
                        </p>
                      )}
                      {request.admin_note && (
                        <p className="mt-2 text-xs font-medium text-blue-800">
                          The admin team left you a message.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}