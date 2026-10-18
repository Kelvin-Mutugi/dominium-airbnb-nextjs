import Link from "next/link";
import { formatDate, humanize } from "@/app/lib/format";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { ListingChangeReviewForm } from "@/components/admin/listing-changes/review-form";

const STATUSES = ["pending_review", "follow_up", "reviewed", "all"] as const;

type ListingChangeRequest = {
  id: string;
  listing_id: string;
  host_id: string;
  host_note: string | null;
  before_values: Record<string, unknown>;
  after_values: Record<string, unknown>;
  status: string;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type ListingChangeRequestWithDetails = ListingChangeRequest & {
  listing_title: string | null;
  host: {
    full_name: string | null;
    business_name: string | null;
    phone: string | null;
  } | null;
};

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  county: "County",
  town: "Town",
  address: "Address",
  property_type: "Property type",
  categories: "Categories",
  price_per_night: "Nightly price",
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
  cancellation_policy: "Legacy listing cancellation note (does not change refund estimates)",
};

function valueForDisplay(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "Not set";
  if (field === "price_per_night") {
    return `KES ${Number(value).toLocaleString("en-KE")}/night`;
  }
  if (field === "instant_book") return value ? "On" : "Off";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  return String(value);
}

function statusHref(status: string) {
  return status === "all"
    ? "/admin/listing-changes?status=all"
    : `/admin/listing-changes?status=${status}`;
}

export default async function AdminListingChangesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as (typeof STATUSES)[number])
    : "pending_review";
  const admin = getSupabaseAdmin();

  let query = admin
    .from("host_listing_change_requests")
    .select(
      "id, listing_id, host_id, host_note, before_values, after_values, status, admin_note, reviewed_at, created_at",
    )
    .order("created_at", { ascending: status === "pending_review" })
    .limit(300);
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    throw new Error(
      "Unable to load listing change reviews. Apply the host listing change requests migration and retry.",
    );
  }

  const requests = (data ?? []) as ListingChangeRequest[];
  const hostIds = [...new Set(requests.map((request) => request.host_id))];
  const listingIds = [...new Set(requests.map((request) => request.listing_id))];
  const [profilesResult, listingsResult] = await Promise.all([
    hostIds.length
      ? admin
          .from("profiles")
          .select("id, full_name, business_name, phone")
          .in("id", hostIds)
      : Promise.resolve({ data: [], error: null }),
    listingIds.length
      ? admin.from("listings").select("id, title").in("id", listingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error) throw new Error("Unable to load host details for listing reviews.");
  if (listingsResult.error) throw new Error("Unable to load listing details for listing reviews.");

  const hosts = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const listingTitles = new Map((listingsResult.data ?? []).map((listing) => [listing.id, listing.title]));
  const requestsWithDetails: ListingChangeRequestWithDetails[] = requests.map(
    (request) => ({
      ...request,
      host: hosts.get(request.host_id) ?? null,
      listing_title: listingTitles.get(request.listing_id) ?? null,
    }),
  );

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Listing changes</h1>
        <p className="mt-1 text-sm text-gray-600">
          Hosts’ saved edits are live immediately. Review the change history and follow up with hosts here.
        </p>
      </header>

      <nav aria-label="Filter listing change reviews" className="flex flex-wrap gap-2 border-b pb-3">
        {STATUSES.map((item) => (
          <Link
            key={item}
            href={statusHref(item)}
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

      <p className="text-xs text-gray-500">
        {requestsWithDetails.length} requests shown · latest 300
      </p>
      {requestsWithDetails.length === 0 ? (
        <p className="border-y bg-white px-4 py-12 text-center text-sm text-gray-500">
          No listing changes match this filter.
        </p>
      ) : (
        <div className="divide-y border-y bg-white">
          {requestsWithDetails.map((request) => {
            const changedFields = Object.keys(request.after_values).filter(
              (field) =>
                JSON.stringify(request.before_values[field]) !==
                JSON.stringify(request.after_values[field]),
            );
            const hostName =
              request.host?.business_name ??
              request.host?.full_name ??
              request.host_id;

            return (
              <article
                key={request.id}
                className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_21rem]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-[#1B1A2E]">
                      {request.listing_title ?? "Listing"}
                    </h2>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                      {humanize(request.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Host:{" "}
                    <Link
                      href={`/admin/users/${request.host_id}`}
                      className="font-medium text-[#CF2F74] hover:underline"
                    >
                      {hostName}
                    </Link>
                    {request.host?.phone ? ` · ${request.host.phone}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Submitted {formatDate(request.created_at, "long")}
                    {request.reviewed_at
                      ? ` · reviewed ${formatDate(request.reviewed_at, "long")}`
                      : ""}
                  </p>
                  <Link
                    href={`/admin/listings/${request.listing_id}`}
                    className="mt-2 inline-block text-sm font-medium text-[#CF2F74] hover:underline"
                  >
                    Open listing
                  </Link>

                  <div className="mt-4 divide-y rounded-lg border border-gray-200">
                    {changedFields.length ? (
                      changedFields.map((field) => (
                        <div
                          key={field}
                          className="grid gap-1 p-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]"
                        >
                          <p className="font-medium text-gray-600">
                            {FIELD_LABELS[field] ?? field}
                          </p>
                          <p className="break-words text-gray-800">
                            <span className="text-gray-500">
                              {valueForDisplay(field, request.before_values[field])}
                            </span>{" "}
                            <span aria-hidden="true">→</span>{" "}
                            {valueForDisplay(field, request.after_values[field])}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-sm text-gray-600">
                        No listing fields changed; review the host’s note.
                      </p>
                    )}
                  </div>
                  {request.host_note && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Host note
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                        {request.host_note}
                      </p>
                    </div>
                  )}
                </div>
                <ListingChangeReviewForm
                  requestId={request.id}
                  status={request.status}
                  adminNote={request.admin_note}
                />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
