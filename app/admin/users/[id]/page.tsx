import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { UserRowActions } from "@/components/admin/users/user-row-actions";

type HostListing = {
  id: string;
  title: string | null;
  county: string | null;
  town: string | null;
  price_per_night: number | string | null;
  status: string | null;
  listing_images?: Array<{ url: string | null; sort_order: number }> | null;
};

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
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

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !profile) notFound();

  const { data: authUser } = await admin.auth.admin.getUserById(id);

  let listings: HostListing[] = [];
  if (profile.role === "host") {
    const { data: hostListings } = await admin
      .from("listings")
      .select("id, title, county, town, price_per_night, status, listing_images ( url, sort_order )")
      .eq("host_id", id)
      .order("created_at", { ascending: false });
    listings = (hostListings ?? []) as HostListing[];
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to users
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-[#1B1A2E]">
            {displayValue(profile.full_name)}
          </h1>
          <p className="mt-1 text-sm text-gray-500">User ID: {profile.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium capitalize text-gray-700">
            {displayValue(profile.role)}
          </span>
          <UserRowActions
            userId={profile.id}
            status={profile.status}
            role={profile.role}
            hostVerifiedAt={profile.host_verified_at}
          />
        </div>
      </div>

      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1A2E]">User details</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Full name" value={profile.full_name} />
          <DetailField label="Email" value={authUser?.user?.email} />
          <DetailField label="Phone" value={profile.phone} />
          <DetailField label="Role" value={profile.role} />
          <DetailField label="Status" value={profile.status} />
          <DetailField label="Business name" value={profile.business_name} />
          <DetailField label="Host verified" value={Boolean(profile.host_verified_at)} />
          <DetailField label="Host verified at" value={formatDate(profile.host_verified_at)} />
          <DetailField label="Created at" value={formatDate(profile.created_at)} />
          <DetailField label="Updated at" value={formatDate(profile.updated_at)} />
        </dl>
      </section>

      {profile.role === "host" && (
        <section className="mt-6 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-[#1B1A2E]">Host listings</h2>
            <span className="text-sm text-gray-500">{listings.length} total</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((listing) => {
              const cover = [...(listing.listing_images ?? [])].sort(
                (first, second) => first.sort_order - second.sort_order,
              )[0];

              return (
                <Link
                  key={listing.id}
                  href={`/admin/listings/${listing.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="overflow-hidden rounded-md border border-gray-200 transition hover:border-[#E23E85] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E23E85]"
                >
                  <div className="aspect-[16/9] bg-gray-100">
                    {cover?.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover.url}
                        alt={listing.title ?? "Listing"}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-[#1B1A2E]">{displayValue(listing.title)}</p>
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {displayValue(listing.town)}, {displayValue(listing.county)}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-[#1B1A2E]">
                        KES {Number(listing.price_per_night ?? 0).toLocaleString()}/night
                      </span>
                      <span className="capitalize text-gray-500">
                        {displayValue(listing.status).replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {listings.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">This host has no listings.</p>
          )}
        </section>
      )}
    </div>
  );
}