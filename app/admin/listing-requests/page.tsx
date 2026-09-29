import Link from "next/link";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { formatDate, humanize } from "@/app/lib/format";
import { ListingRequestReviewForm } from "@/components/admin/listing-requests/listing-request-review-form";

const STATUSES = ["all", "submitted", "reviewing", "visit_scheduled", "visited", "details_collected", "listing_created", "declined"];

type HostRequest = {
  id: string;
  host_id: string;
  proposed_title: string;
  property_type: string;
  county: string;
  town: string;
  address: string | null;
  contact_phone: string | null;
  property_notes: string | null;
  status: string;
  proposed_visit_at: string | null;
  admin_notes: string | null;
  host_message: string | null;
  listing_id: string | null;
  created_at: string;
  host?: { full_name: string | null; business_name: string | null; phone: string | null } | null;
};

function hrefFor(status: string, query: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (query) params.set("q", query);
  const suffix = params.toString();
  return suffix ? `/admin/listing-requests?${suffix}` : "/admin/listing-requests";
}

export default async function AdminListingRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status ?? "submitted") ? params.status ?? "submitted" : "submitted";
  const query = (params.q ?? "").trim().slice(0, 100).toLowerCase();
  const admin = getSupabaseAdmin();

  let requestsQuery = admin
    .from("host_listing_requests")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(300);
  if (status !== "all") requestsQuery = requestsQuery.eq("status", status);

  const { data, error } = await requestsQuery;
  if (error) throw new Error("Unable to load host property requests. Apply the host listing requests migration and retry.");

  const allRequests = (data ?? []) as unknown as HostRequest[];
  const hostIds = [...new Set(allRequests.map((request) => request.host_id))];
  const { data: profiles, error: profilesError } = hostIds.length
    ? await admin.from("profiles").select("id, full_name, business_name, phone").in("id", hostIds)
    : { data: [], error: null };
  if (profilesError) throw new Error("Unable to load host details for property requests.");
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const requestsWithHosts = allRequests.map((request) => ({ ...request, host: profileById.get(request.host_id) ?? null }));
  const requests = requestsWithHosts.filter((request) => !query || [
    request.proposed_title,
    request.property_type,
    request.county,
    request.town,
    request.host?.full_name,
    request.host?.business_name,
    request.contact_phone,
    request.id,
    request.host_id,
  ].filter(Boolean).join(" ").toLowerCase().includes(query));

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Property visit requests</h1>
        <p className="mt-1 text-sm text-gray-600">Review host leads, arrange due diligence visits, and collect listing details.</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
        <nav aria-label="Filter property request status" className="flex flex-wrap gap-1">
          {STATUSES.map((item) => (
            <Link key={item} href={hrefFor(item, query)} aria-current={status === item ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm ${status === item ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
              {humanize(item)}
            </Link>
          ))}
        </nav>
        <form action="/admin/listing-requests" className="flex w-full max-w-md gap-2">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <label htmlFor="request-search" className="sr-only">Search property requests</label>
          <input id="request-search" name="q" type="search" maxLength={100} defaultValue={params.q ?? ""} placeholder="Search property, host, location, or ID" className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1B1A2E] placeholder:text-gray-400 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
          <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">Search</button>
        </form>
      </div>

      <p className="text-xs text-gray-500">{requests.length} requests shown · latest 300</p>
      {requests.length === 0 ? (
        <p className="border-y bg-white px-4 py-12 text-center text-sm text-gray-500">No property requests match this filter.</p>
      ) : (
        <div className="divide-y border-y bg-white">
          {requests.map((request) => (
            <article key={request.id} className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-[#1B1A2E]">{request.proposed_title}</h2>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">{humanize(request.status)}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{request.property_type} · {request.town}, {request.county}</p>
                <p className="mt-3 text-sm text-gray-700">
                  Host: <Link href={`/admin/users/${request.host_id}`} className="font-medium text-[#CF2F74] hover:underline">{request.host?.business_name ?? request.host?.full_name ?? request.host_id}</Link>
                  {request.host?.phone ? ` · ${request.host.phone}` : ""}
                </p>
                {request.contact_phone && <p className="mt-1 text-sm text-gray-700">On-site contact: {request.contact_phone}</p>}
                {request.address && <p className="mt-1 text-sm text-gray-700">Address: {request.address}</p>}
                {request.property_notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">{request.property_notes}</p>}
                <p className="mt-3 text-xs text-gray-400">Request {request.id} · submitted {formatDate(request.created_at, "long")}</p>
                {request.listing_id && <Link href={`/admin/listings/${request.listing_id}`} className="mt-2 inline-block text-sm font-medium text-[#CF2F74] hover:underline">Open created listing</Link>}
                {!request.listing_id && request.status === "details_collected" && (
                  <Link href={`/admin/listings/new?hostId=${encodeURIComponent(request.host_id)}&requestId=${encodeURIComponent(request.id)}`} className="mt-3 inline-flex rounded-md bg-[#E23E85] px-3 py-2 text-sm font-semibold text-white hover:bg-[#c93075]">Create listing for this host</Link>
                )}
              </div>
              <ListingRequestReviewForm request={request} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}