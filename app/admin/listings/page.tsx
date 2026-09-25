// app/admin/listings/page.tsx
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { ListingTabs } from "@/components/admin/listings/tabs";
import { ListingRowActions } from "@/components/admin/listings/listing-row-actions";
import { AdminSearchInput } from "@/components/admin/search-input";
import Link from "next/link";

function escapeSearchTerm(value: string) {
  return value.trim().slice(0, 100).replace(/[%,()]/g, "");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const activeStatus = status ?? "pending_review";
  const searchTerm = escapeSearchTerm(q ?? "");

  const admin = getSupabaseAdmin();
  let listingsQuery = admin
    .from("listings")
    .select(
      `id, title, county, town, price_per_night, status, created_at,
       profiles:host_id ( full_name, business_name ),
       listing_images ( url, sort_order )`
    )
    .eq("status", activeStatus);

  if (searchTerm) {
    const pattern = `%${searchTerm}%`;
    const searchFields = [`title.ilike.${pattern}`, `town.ilike.${pattern}`, `county.ilike.${pattern}`];
    if (isUuid(searchTerm)) searchFields.push(`id.eq.${searchTerm}`);
    listingsQuery = listingsQuery.or(searchFields.join(","));
  }

  const { data: listings } = await listingsQuery.order("created_at", {
    ascending: false,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1 text-[#E23E85]">Listings</h1>
      <p className="text-sm text-gray-600 mb-4">
        Review submissions, and manage whats live on the site.
      </p>

      <AdminSearchInput placeholder="Search by title, town, county, or ID" />
      <ListingTabs />

      <div className="grid gap-4">
        {(listings ?? []).map((l) => {
          const profile = Array.isArray(l.profiles)
            ? l.profiles[0] ?? null
            : l.profiles ?? null;
          const cover = [...(l.listing_images ?? [])].sort(
            (a, b) => a.sort_order - b.sort_order
          )[0];

          return (
            <div
              key={l.id}
              className="bg-white rounded-lg shadow-sm p-4 flex gap-4 items-center"
            >
              <Link
                href={`/admin/listings/${l.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 min-w-0 gap-4 items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E23E85]"
              >
                <div className="w-24 h-24 bg-gray-100 rounded overflow-hidden shrink-0">
                  {cover?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover.url}
                      alt={l.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1B1A2E] hover:text-[#E23E85]">{l.title}</p>
                  <p className="text-sm text-gray-500">
                    {l.town}, {l.county} · KES {Number(l.price_per_night).toLocaleString()}/night
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Host: {profile?.business_name ?? profile?.full_name}
                  </p>
                </div>
              </Link>

              <ListingRowActions listingId={l.id} status={l.status} />
            </div>
          );
        })}

        {(listings ?? []).length === 0 && (
          <p className="text-center text-gray-400 py-12">
            No listings with this status.
          </p>
        )}
      </div>
    </div>
  );
}