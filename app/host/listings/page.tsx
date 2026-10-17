// app/host/listings/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronRight, Info, Plus, Star, X } from "lucide-react";
import { getHostListingRequestsData, getHostListingsData, submitHostListingRequest } from "@/app/lib/host/actions";
import type { HostListingRequest, Listing } from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const FILTERS = ["all", "published", "pending_review", "draft", "suspended", "archived"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  published: "Live",
  pending_review: "Pending review",
  draft: "Draft",
  suspended: "Suspended",
  archived: "Archived",
};

const REQUEST_STATUS: Record<HostListingRequest["status"], { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-sky-50 text-sky-800" },
  reviewing: { label: "Under review", className: "bg-amber-50 text-amber-800" },
  visit_scheduled: { label: "Visit scheduled", className: "bg-indigo-50 text-indigo-800" },
  visited: { label: "Visit completed", className: "bg-cyan-50 text-cyan-800" },
  details_collected: { label: "Details collected", className: "bg-emerald-50 text-emerald-800" },
  listing_created: { label: "Listing created", className: "bg-green-50 text-green-800" },
  declined: { label: "Unable to proceed", className: "bg-gray-100 text-gray-700" },
};

const EMPTY_REQUEST = {
  proposedTitle: "",
  propertyType: "",
  county: "",
  town: "",
  address: "",
  contactPhone: "",
  propertyNotes: "",
};

/* ------------------------------------------------------------------ */
/* Shared styling (same tokens as the overview page)                   */
/* ------------------------------------------------------------------ */

const card = "rounded-2xl border border-[#E9E6DD] bg-white";
const linkAccent = "text-sm font-semibold text-[#9C2454] hover:underline underline-offset-4";
const inputClass =
  "w-full rounded-lg border border-[#12231d]/20 bg-white px-3 py-2.5 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20";

function SegmentedBar({ percent, segments = 10 }: { percent: number; segments?: number }) {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * segments);
  return (
    <div className="flex gap-[3px]" aria-hidden="true">
      {Array.from({ length: segments }).map((_, index) => (
        <span
          key={index}
          className={`h-4 flex-1 rounded-full ${index < filled ? "bg-[#12231d]" : "bg-[#12231d]/10"}`}
        />
      ))}
    </div>
  );
}

function Field({
  id,
  label,
  optional,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-[#12231d]">
        {label}
        {optional && <span className="font-normal text-gray-500"> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

type ListingWithImages = Listing & {
  listing_images?: { url: string; sort_order: number }[];
};

function getGuidance(listing: Listing) {
  const status = listing.status as string;
  if (status === "published") {
    return {
      detail: "Live and bookable. Keep your calendar up to date.",
      action: "Manage calendar",
      href: "/host/calendar",
      icon: true,
    };
  }
  if (status === "pending_review") {
    return {
      detail: "Submitted and waiting for admin review.",
      action: "Ask about review",
      href: "/account/support?category=listing_issue",
      icon: false,
    };
  }
  if (status === "draft" && listing.is_publish_ready) {
    return {
      detail: "Details are ready for admin review. Publishing is managed by the admin team.",
      action: "Ask about review",
      href: "/account/support?category=listing_issue",
      icon: false,
    };
  }
  if (status === "draft") {
    return {
      detail: "Not live yet. The admin team needs to finish the listing details before publishing.",
      action: "Ask about listing",
      href: "/account/support?category=listing_issue",
      icon: false,
    };
  }
  if (status === "suspended") {
    return {
      detail: "Temporarily unavailable to guests. Contact support for the current status and next steps.",
      action: "Contact support",
      href: "/account/support?category=listing_issue",
      icon: false,
    };
  }
  return {
    detail: "Not bookable. Contact support if this listing should be reviewed for reactivation.",
    action: "Ask about reactivation",
    href: "/account/support?category=listing_issue",
    icon: false,
  };
}

function ListingsSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-6" aria-busy="true" aria-label="Loading your listings">
      <div className="h-20 rounded-2xl bg-[#12231d]/5" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-28 rounded-2xl bg-[#12231d]/5" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-44 rounded-2xl bg-[#12231d]/5" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-[#12231d]/5" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function HostListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [statusCounts, setStatusCounts] = useState<
    Awaited<ReturnType<typeof getHostListingsData>>["statusCounts"]
  >({
    published: 0,
    draft: 0,
    pending_review: 0,
    suspended: 0,
    archived: 0,
  });
  const [requests, setRequests] = useState<HostListingRequest[]>([]);
  const requestsLoaded = useRef(false);
  const statusCountsLoaded = useRef(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestValues, setRequestValues] = useState(EMPTY_REQUEST);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  async function load(
    showLoader: boolean,
    requestedPage: number,
    requestedFilter: Filter,
    includeRequests: boolean,
    includeStatusCounts: boolean,
  ) {
    try {
      if (showLoader) setLoading(true);
      setError(null);
      if (includeRequests) requestsLoaded.current = true;
      if (includeStatusCounts) statusCountsLoaded.current = true;

      const [data, hostRequests] = await Promise.all([
        getHostListingsData(requestedPage, requestedFilter, includeStatusCounts),
        includeRequests ? getHostListingRequestsData() : Promise.resolve(null),
      ]);
      setListings(data.listings);
      setFilteredCount(data.filteredCount);
      setTotalPages(data.totalPages);
      setPageSize(data.pageSize);
      if (data.totalCount !== null) setTotalCount(data.totalCount);
      if (data.statusCounts) setStatusCounts(data.statusCounts);
      if (hostRequests) {
        setRequests(hostRequests);
      }
    } catch (err) {
      if (includeRequests) requestsLoaded.current = false;
      if (includeStatusCounts) statusCountsLoaded.current = false;
      console.error("Failed to load listings:", err);
      setError("We couldn't load your listings. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitListingRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingRequest(true);
    setRequestError(null);
    setRequestSuccess(null);
    try {
      const request = await submitHostListingRequest(requestValues);
      setRequests((current) => [request, ...current]);
      setRequestValues(EMPTY_REQUEST);
      setShowRequestForm(false);
      setRequestSuccess("Your property visit request was sent to the admin team.");
    } catch (submitError) {
      setRequestError(submitError instanceof Error ? submitError.message : "Unable to submit your property request.");
    } finally {
      setSubmittingRequest(false);
    }
  }

  useEffect(() => {
    load(
      true,
      page,
      filter,
      !requestsLoaded.current,
      !statusCountsLoaded.current,
    );
  }, [page, filter]);

  if (loading) return <ListingsSkeleton />;

  /* ---------------------------- derived data ---------------------------- */

  const statusOf = (listing: Listing) => listing.status as string;
  const countFor = (value: Filter) =>
    value === "all" ? totalCount : statusCounts?.[value] ?? 0;

  const liveCount = countFor("published");
  const inProgressCount = countFor("draft") + countFor("pending_review");
  const offlineCount = countFor("suspended") + countFor("archived");
  const livePercent = totalCount ? Math.round((liveCount / totalCount) * 100) : 0;

  const visibleFilters = FILTERS.filter((value) => value === "all" || value === filter || countFor(value) > 0);

  /* ------------------------------ render ------------------------------ */

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-6">
      {/* Header */}
      <header>
        <p className="text-sm text-[#747873]">Host portal / Listings</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-[#12231d]">Your listings</h1>
        <p className="mt-1 text-sm text-[#656a65]">
          See how each property is doing and what happens next.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-[#E9E6DD] bg-[#faf8f4] px-4 py-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#747873]" aria-hidden="true" />
        <p className="text-sm text-[#565c57]">
          Our team sets up, reviews and publishes listings during verification. You can view your property details
          here and ask us for changes.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            onClick={() =>
              load(
                true,
                page,
                filter,
                !requestsLoaded.current,
                !statusCountsLoaded.current,
              )
            }
            className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Summary cards */}
      {totalCount > 0 && (
        <section aria-label="Listings summary" className="grid gap-4 sm:grid-cols-3">
          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-[#656a65]">Live</p>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                Bookable
              </span>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[#12231d]">
              {liveCount}
              <span className="ml-1.5 text-base font-normal text-[#747873]">of {listings.length}</span>
            </p>
            <div className="mt-3">
              <SegmentedBar percent={livePercent} />
            </div>
            <p className="mt-2 text-xs text-[#747873]">{livePercent}% of your properties are live</p>
          </div>

          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-[#656a65]">Getting ready</p>
              <span className="rounded-full bg-[#fff0d8] px-2 py-0.5 text-xs font-semibold text-[#9a5b00]">
                With our team
              </span>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[#12231d]">{inProgressCount}</p>
            <p className="mt-1 text-xs text-[#747873]">Drafts and listings waiting for review</p>
          </div>

          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-[#656a65]">Not bookable</p>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">Offline</span>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[#12231d]">{offlineCount}</p>
            <p className="mt-1 text-xs text-[#747873]">Suspended or archived listings</p>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* ---------- Main column: filters + listings ---------- */}
        <div className="space-y-4">
          {totalCount > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter listings by status">
              {visibleFilters.map((value) => {
                const active = filter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setFilter(value);
                      setPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#E23E85]/30 ${
                      active
                        ? "bg-[#12231d] text-white"
                        : "border border-[#E9E6DD] bg-white text-[#565c57] hover:bg-[#f9f6f1] hover:text-[#12231d]"
                    }`}
                  >
                    {FILTER_LABEL[value]}
                    <span
                      className={`rounded-full px-1.5 text-xs tabular-nums ${
                        active ? "bg-white/20 text-white" : "bg-[#f3efe9] text-[#656a65]"
                      }`}
                    >
                      {countFor(value)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {listings.length === 0 ? (
            <div className={`${card} px-6 py-10 text-center`}>
              <p className="text-sm font-semibold text-[#12231d]">
                {totalCount === 0 ? "No listings yet" : `No ${FILTER_LABEL[filter].toLowerCase()} listings`}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-[#747873]">
                {totalCount === 0
                  ? "Send us your property details and our team will arrange a visit and set up your listing."
                  : "Try a different filter to see your other properties."}
              </p>
              {totalCount > 0 && filter !== "all" && (
                <button type="button" onClick={() => { setFilter("all"); setPage(1); }} className={`${linkAccent} mt-3`}>
                  Show all listings
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-4">
              {listings.map((listing) => {
                const images = (listing as ListingWithImages).listing_images;
                const cover = images ? [...images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url : undefined;
                const guidance = getGuidance(listing);
                const reviewCount = Number(listing.review_count ?? 0);
                const incomplete = !listing.is_publish_ready && statusOf(listing) !== "published";

                return (
                  <li key={listing.id} className={`${card} overflow-hidden`}>
                    <div className="flex flex-col sm:flex-row">
                      <Link
                        href={`/host/listings/${listing.id}`}
                        aria-label={`View ${listing.title}`}
                        className="relative block h-44 w-full shrink-0 bg-[#f3efe9] sm:h-auto sm:w-52"
                      >
                        {cover ? (
                          <Image
                            src={cover}
                            alt=""
                            fill
                            sizes="(min-width: 640px) 208px, 100vw"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full min-h-28 items-center justify-center text-xs text-gray-400">
                            No photo yet
                          </span>
                        )}
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/host/listings/${listing.id}`} className="min-w-0">
                            <h2 className="truncate text-lg font-semibold text-[#12231d] hover:underline underline-offset-4">
                              {listing.title}
                            </h2>
                          </Link>
                          <StatusBadge status={listing.status} />
                          {incomplete && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              Incomplete
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-[#747873]">
                          {listing.town}, {listing.county}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-lg bg-[#faf8f4] px-2.5 py-1 font-semibold tabular-nums text-[#12231d]">
                            KES {listing.price_per_night.toLocaleString("en-KE")} / night
                          </span>
                          <span className="rounded-lg bg-[#faf8f4] px-2.5 py-1 text-[#565c57]">
                            {listing.bedrooms} {listing.bedrooms === 1 ? "bedroom" : "bedrooms"}
                          </span>
                          <span className="rounded-lg bg-[#faf8f4] px-2.5 py-1 text-[#565c57]">
                            {listing.bathrooms} {listing.bathrooms === 1 ? "bathroom" : "bathrooms"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[#faf8f4] px-2.5 py-1 text-[#565c57]">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-500" aria-hidden="true" />
                            {reviewCount > 0
                              ? `${listing.average_rating.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? "review" : "reviews"})`
                              : "No reviews yet"}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-[#faf8f4] px-3.5 py-2.5 sm:mt-auto sm:pt-2.5">
                          <p className="min-w-0 flex-1 text-sm text-[#565c57]">{guidance.detail}</p>
                          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
                            <Link href={`/host/listings/${listing.id}/edit`} className={linkAccent}>
                              Request a change
                            </Link>
                            <Link
                              href={`/host/listings/${listing.id}/arrival-guide`}
                              className={linkAccent}
                            >
                              Edit arrival guide
                            </Link>
                            <Link href={guidance.href} className={`${linkAccent} inline-flex items-center gap-1.5`}>
                              {guidance.icon && <CalendarDays className="h-4 w-4" aria-hidden="true" />}
                              {guidance.action}
                              {!guidance.icon && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {totalCount > 0 && (
            <nav aria-label="Listings pages" className={`${card} flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between`}>
              <p className="text-sm text-[#656a65]" aria-live="polite">
                Showing {filteredCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredCount)} of {filteredCount} listings
              </p>
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#12231d]/15 px-3 text-sm font-semibold text-[#12231d] hover:bg-[#f9f6f1] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Previous
                  </button>
                  <span className="text-sm tabular-nums text-[#565c57]">Page {page} of {totalPages}</span>
                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#12231d]/15 px-3 text-sm font-semibold text-[#12231d] hover:bg-[#f9f6f1] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </nav>
          )}
        </div>

        {/* ---------- Side rail: property requests ---------- */}
        <aside className="space-y-6">
          <section className={`${card} p-5`} aria-label="Request a property visit">
            <h2 className="text-lg font-semibold text-[#12231d]">Have another property?</h2>
            <p className="mt-1 text-sm text-[#747873]">
              Send us its details and we&apos;ll arrange a property visit before listing it.
            </p>

            <button
              type="button"
              onClick={() => {
                setShowRequestForm((open) => !open);
                setRequestError(null);
              }}
              aria-expanded={showRequestForm}
              aria-controls="property-request-form"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#12231d] px-4 text-sm font-semibold text-white transition hover:bg-[#243c34]"
            >
              {showRequestForm ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {showRequestForm ? "Close request" : "Request a property visit"}
            </button>

            {requestSuccess && (
              <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
                {requestSuccess}
              </p>
            )}

            {showRequestForm && (
              <form id="property-request-form" onSubmit={submitListingRequest} className="mt-5 space-y-4 border-t border-[#12231d]/10 pt-5">
                <Field id="request-property-name" label="Property name">
                  <input
                    id="request-property-name"
                    required
                    minLength={3}
                    maxLength={120}
                    value={requestValues.proposedTitle}
                    onChange={(event) => setRequestValues({ ...requestValues, proposedTitle: event.target.value })}
                    className={inputClass}
                    placeholder="e.g. Greenview Apartment"
                  />
                </Field>
                <Field id="request-property-type" label="Property type">
                  <input
                    id="request-property-type"
                    required
                    minLength={2}
                    maxLength={80}
                    value={requestValues.propertyType}
                    onChange={(event) => setRequestValues({ ...requestValues, propertyType: event.target.value })}
                    className={inputClass}
                    placeholder="Apartment, villa, guesthouse…"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="request-county" label="County">
                    <input
                      id="request-county"
                      required
                      minLength={2}
                      maxLength={80}
                      value={requestValues.county}
                      onChange={(event) => setRequestValues({ ...requestValues, county: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field id="request-town" label="Town or area">
                    <input
                      id="request-town"
                      required
                      minLength={2}
                      maxLength={100}
                      value={requestValues.town}
                      onChange={(event) => setRequestValues({ ...requestValues, town: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field id="request-address" label="Address or directions" optional>
                  <input
                    id="request-address"
                    maxLength={500}
                    value={requestValues.address}
                    onChange={(event) => setRequestValues({ ...requestValues, address: event.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field id="request-contact" label="On-site contact" optional>
                  <input
                    id="request-contact"
                    type="tel"
                    inputMode="tel"
                    maxLength={40}
                    value={requestValues.contactPhone}
                    onChange={(event) => setRequestValues({ ...requestValues, contactPhone: event.target.value })}
                    className={inputClass}
                    placeholder="Phone number for arranging a visit"
                  />
                </Field>
                <Field id="request-notes" label="Additional details" optional>
                  <textarea
                    id="request-notes"
                    maxLength={3000}
                    rows={3}
                    value={requestValues.propertyNotes}
                    onChange={(event) => setRequestValues({ ...requestValues, propertyNotes: event.target.value })}
                    className={inputClass}
                    placeholder="Best time to visit, number of units, or anything we should know"
                  />
                </Field>

                {requestError && (
                  <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
                    {requestError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="min-h-11 w-full rounded-lg bg-[#E23E85] px-4 text-sm font-semibold text-white transition hover:bg-[#cf3577] disabled:opacity-50"
                >
                  {submittingRequest ? "Sending request…" : "Send to admin team"}
                </button>
              </form>
            )}
          </section>

          {requests.length > 0 && (
            <section className={card} aria-label="Your property requests">
              <div className="flex items-center justify-between gap-3 px-5 pt-5">
                <h2 className="text-lg font-semibold text-[#12231d]">Your property requests</h2>
                <span className="rounded-md bg-[#f3efe9] px-1.5 py-0.5 text-xs font-semibold tabular-nums text-[#565c57]">
                  {requests.length}
                </span>
              </div>
              <ul className="space-y-2.5 p-5">
                {requests.map((request) => {
                  const status = REQUEST_STATUS[request.status];
                  return (
                    <li key={request.id} className="rounded-xl border border-[#E9E6DD] p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#12231d]">{request.proposed_title}</p>
                          <p className="mt-0.5 truncate text-xs text-[#747873]">
                            {request.town}, {request.county}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-[#747873]">
                        Submitted {new Date(request.created_at).toLocaleDateString("en-KE")}
                      </p>
                      {request.proposed_visit_at && (
                        <p className="mt-1 text-xs font-medium text-[#12231d]">
                          Visit: {new Date(request.proposed_visit_at).toLocaleString("en-KE")}
                        </p>
                      )}
                      {request.host_message && (
                        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-[#faf8f4] px-3 py-2 text-sm text-[#565c57]">
                          {request.host_message}
                        </p>
                      )}
                      {request.listing_id && (
                        <Link
                          href={`/host/listings/${request.listing_id}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#9C2454] hover:underline"
                        >
                          View created listing <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
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