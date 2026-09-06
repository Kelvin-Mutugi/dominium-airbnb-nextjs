// app/admin/listings/page.tsx
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { ListingTabs } from "@/components/admin/listings/tabs";
import { ListingRowActions } from "@/components/admin/listings/listing-row-actions";

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = status ?? "draft";

  const admin = getSupabaseAdmin();
  const { data: listings } = await admin
    .from("listings")
    .select(
      `id, title, county, town, price_per_night, status, created_at,
       profiles:host_id ( full_name, business_name ),
       listing_images ( url, sort_order )`
    )
    .eq("status", activeStatus)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Listings</h1>
      <p className="text-sm text-gray-600 mb-4">
        Review submissions, and manage whats live on the site.
      </p>

      <ListingTabs />

      <div className="grid gap-4">
        {(listings ?? []).map((l: any) => {
          const cover = [...(l.listing_images ?? [])].sort(
            (a, b) => a.sort_order - b.sort_order
          )[0];

          return (
            <div
              key={l.id}
              className="bg-white rounded-lg shadow-sm p-4 flex gap-4 items-center"
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

              <div className="flex-1">
                <p className="font-medium">{l.title}</p>
                <p className="text-sm text-gray-500">
                  {l.town}, {l.county} · KES {Number(l.price_per_night).toLocaleString()}/night
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Host: {l.profiles?.business_name ?? l.profiles?.full_name}
                </p>
              </div>

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