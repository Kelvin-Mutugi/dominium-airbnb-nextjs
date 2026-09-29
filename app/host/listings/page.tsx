// app/host/listings/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import { getHostListingRequestsData, getHostListingsData, submitHostListingRequest } from "@/app/lib/host/actions";
import type { HostListingRequest, Listing } from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";

const FILTERS = [
  "all",
  "published",
  "draft",
  "suspended",
] as const;

type Filter = (typeof FILTERS)[number];

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

export default function HostListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<HostListingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestValues, setRequestValues] = useState(EMPTY_REQUEST);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  async function load(showLoader = false) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError(null);

      const [data, hostRequests] = await Promise.all([
        getHostListingsData(),
        getHostListingRequestsData(),
      ]);
      setListings(data);
      setRequests(hostRequests);
    } catch (err) {
      console.error("Failed to load listings:", err);
      setError(
        "We couldn't load your listings. Please try again.",
      );
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(true);
  }, []);

  const visible = listings.filter(
    (l) => filter === "all" || l.status === filter,
  );

  /*
   * Initial loading state
   */
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
        </div>

        {/* Filter skeletons */}
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <div
              key={f}
              className="h-8 w-20 animate-pulse rounded-full bg-gray-200"
            />
          ))}
        </div>

        {/* Listing skeletons */}
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="h-24 w-full shrink-0 rounded-xl bg-gray-200 sm:w-36" />

                <div className="flex-1 space-y-3">
                  <div className="h-5 w-56 rounded bg-gray-200" />
                  <div className="h-4 w-72 rounded bg-gray-200" />
                  <div className="h-3 w-40 rounded bg-gray-200" />
                </div>

                <div className="flex gap-2">
                  <div className="h-8 w-14 rounded-lg bg-gray-200" />
                  <div className="h-8 w-20 rounded-lg bg-gray-200" />
                  <div className="h-8 w-16 rounded-lg bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#12231d]">
          Your listings
        </h1>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Listings are currently reviewed and managed by the admin team. Hosts can view their property details, but cannot add, edit, publish, or delete listings during this verification phase.
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-[#12231d]">Have another property?</h2>
            <p className="mt-1 text-sm text-gray-500">Send the admin team its details to arrange due diligence and a property visit.</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowRequestForm((visible) => !visible); setRequestError(null); }}
            aria-expanded={showRequestForm}
            className="inline-flex items-center gap-2 rounded-lg bg-[#12231d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243c34]"
          >
            {showRequestForm ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {showRequestForm ? "Close request" : "Request a property visit"}
          </button>
        </div>

        {requestSuccess && <p role="status" className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{requestSuccess}</p>}
        {showRequestForm && (
          <form onSubmit={submitListingRequest} className="mt-5 space-y-4 border-t border-gray-100 pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="request-property-name" className="mb-1 block text-sm font-medium text-[#12231d]">Property name</label>
                <input id="request-property-name" required minLength={3} maxLength={120} value={requestValues.proposedTitle} onChange={(event) => setRequestValues({ ...requestValues, proposedTitle: event.target.value })} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20" placeholder="e.g. Greenview Apartment" />
              </div>
              <div>
                <label htmlFor="request-property-type" className="mb-1 block text-sm font-medium text-[#12231d]">Property type</label>
                <input id="request-property-type" required minLength={2} maxLength={80} value={requestValues.propertyType} onChange={(event) => setRequestValues({ ...requestValues, propertyType: event.target.value })} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20" placeholder="Apartment, villa, guesthouse…" />
              </div>
              <div>
                <label htmlFor="request-county" className="mb-1 block text-sm font-medium text-[#12231d]">County</label>
                <input id="request-county" required minLength={2} maxLength={80} value={requestValues.county} onChange={(event) => setRequestValues({ ...requestValues, county: event.target.value })} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20" />
              </div>
              <div>
                <label htmlFor="request-town" className="mb-1 block text-sm font-medium text-[#12231d]">Town / area</label>
                <input id="request-town" required minLength={2} maxLength={100} value={requestValues.town} onChange={(event) => setRequestValues({ ...requestValues, town: event.target.value })} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20" />
              </div>
              <div>
                <label htmlFor="request-address" className="mb-1 block text-sm font-medium text-[#12231d]">Address or directions <span className="font-normal text-gray-500">(optional)</span></label>
                <input id="request-address" maxLength={500} value={requestValues.address} onChange={(event) => setRequestValues({ ...requestValues, address: event.target.value })} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20" />
              </div>
              <div>
                <label htmlFor="request-contact" className="mb-1 block text-sm font-medium text-[#12231d]">On-site contact <span className="font-normal text-gray-500">(optional)</span></label>
                <input id="request-contact" maxLength={40} value={requestValues.contactPhone} onChange={(event) => setRequestValues({ ...requestValues, contactPhone: event.target.value })} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20" placeholder="Phone number for arranging a visit" />
              </div>
            </div>
            <div>
              <label htmlFor="request-notes" className="mb-1 block text-sm font-medium text-[#12231d]">Additional details <span className="font-normal text-gray-500">(optional)</span></label>
              <textarea id="request-notes" maxLength={3000} rows={3} value={requestValues.propertyNotes} onChange={(event) => setRequestValues({ ...requestValues, propertyNotes: event.target.value })} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20" placeholder="Best time to visit, number of units, or anything the team should know" />
            </div>
            {requestError && <p role="alert" className="text-sm text-red-700">{requestError}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={submittingRequest} className="rounded-lg bg-[#ec1561] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {submittingRequest ? "Sending request…" : "Send to admin team"}
              </button>
            </div>
          </form>
        )}

        {requests.length > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-[#12231d]">Your property requests</h3>
            <ul className="mt-2 divide-y divide-gray-100">
              {requests.map((request) => {
                const status = REQUEST_STATUS[request.status];
                return (
                  <li key={request.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#12231d]">{request.proposed_title} · {request.town}, {request.county}</p>
                      <p className="mt-1 text-xs text-gray-500">Submitted {new Date(request.created_at).toLocaleDateString("en-KE")}</p>
                      {request.proposed_visit_at && <p className="mt-1 text-xs text-gray-600">Visit: {new Date(request.proposed_visit_at).toLocaleString("en-KE")}</p>}
                      {request.host_message && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{request.host_message}</p>}
                      {request.listing_id && <Link href={`/host/listings/${request.listing_id}`} className="mt-1 inline-block text-xs font-semibold text-[#b30f4b] hover:underline">View created listing</Link>}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Error message */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            onClick={() => load(true)}
            className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f;

          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ec1561]/30 ${
                active
                  ? "bg-[#12231d] text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 hover:text-[#12231d]"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {visible.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No listings here yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((listing) => {
            const images = (
              listing as Listing & {
                listing_images?: {
                  url: string;
                  sort_order: number;
                }[];
              }
            ).listing_images;

            const cover = images
              ?.sort(
                (a, b) => a.sort_order - b.sort_order,
              )?.[0]?.url;

            return (
              <div
                key={listing.id}
                className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center"
              >
                {/* Cover image */}
                <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:w-36">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={listing.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      No photo
                    </div>
                  )}
                </div>

                {/* Listing information */}
                <Link href={`/host/listings/${listing.id}`} className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#12231d]">
                      {listing.title}
                    </h3>

                    <StatusBadge status={listing.status} />

                    {!listing.is_publish_ready &&
                      listing.status !== "published" && (
                        <span className="text-xs text-gray-400">
                          · incomplete
                        </span>
                      )}
                  </div>

                  <p className="text-sm text-gray-500">
                    {listing.town}, {listing.county} · KES{" "}
                    {listing.price_per_night.toLocaleString()}
                    /night · {listing.bedrooms} bd ·{" "}
                    {listing.bathrooms} ba
                  </p>

                  <p className="text-xs text-gray-400">
                    ★ {listing.average_rating.toFixed(1)} (
                    {listing.review_count} reviews)
                  </p>
                </Link>

                <div className="flex shrink-0 items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                  View details
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
