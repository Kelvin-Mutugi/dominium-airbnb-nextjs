import Link from "next/link";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

const STATUSES = ["all", "draft", "published", "sold", "withdrawn"] as const;

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as (typeof STATUSES)[number])
    : "all";
  let query = getSupabaseAdmin()
    .from("sale_properties")
    .select(
      `id, slug, title, property_type, asking_price, county, town, status, updated_at,
       sale_property_images ( storage_path, sort_order, is_cover )`,
    )
    .order("updated_at", { ascending: false })
    .limit(100);
  if (status !== "all") query = query.eq("status", status);
  query = query.eq("sale_property_images.is_cover", true);

  const { data, error } = await query;
  if (error) throw new Error("Unable to load property sales inventory.");
  const storage = getSupabaseAdmin().storage.from("sale-property-images");

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D9D5CF] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9C2454]">Separate from BnB listings</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#1B1A2E]">Property sales</h1>
          <p className="mt-1 text-sm text-[#5F5D69]">Create and manage owner-submitted apartments, units, and properties for sale.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/sales/leads" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#D9D5CF] bg-white px-4 py-2.5 text-sm font-semibold text-[#4B4A5A]">View buyer leads</Link>
          <Link href="/admin/sales/locations" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#D9D5CF] bg-white px-4 py-2.5 text-sm font-semibold text-[#4B4A5A]">Manage locations</Link>
          <Link href="/admin/sales/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#9C2454] px-4 py-2.5 text-sm font-semibold text-white">Add property</Link>
        </div>
      </header>

      <nav aria-label="Filter property listings" className="flex flex-wrap gap-2">
        {STATUSES.map((item) => (
          <Link key={item} href={item === "all" ? "/admin/sales" : `/admin/sales?status=${item}`} aria-current={status === item ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-sm capitalize ${status === item ? "bg-[#9C2454] font-semibold text-white" : "border border-[#D9D5CF] bg-white text-[#4B4A5A]"}`}>{item === "all" ? "All" : item}</Link>
        ))}
      </nav>

      <div className="grid gap-3">
        {(data ?? []).map((property) => {
          const photos = [...(property.sale_property_images ?? [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);
          const cover = photos[0];
          const coverUrl = cover ? storage.getPublicUrl(cover.storage_path).data.publicUrl : "";
          return (
            <Link key={property.id} href={`/admin/sales/${property.id}/edit`} className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#E6E2DC] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:p-4">
              <div className="h-36 shrink-0 overflow-hidden rounded-lg bg-[#EFEEEB] sm:h-24 sm:w-32">
                {coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-[#1B1A2E]">{property.title}</h2>
                  <span className="rounded-full bg-[#F6EAF0] px-2 py-1 text-xs font-medium capitalize text-[#7D1D43]">{property.status}</span>
                </div>
                <p className="mt-1 text-sm capitalize text-[#6B6A78]">{property.property_type} · {property.town}, {property.county}</p>
                <p className="mt-1 text-sm font-semibold text-[#9C2454]">KES {Number(property.asking_price).toLocaleString("en-KE")}</p>
              </div>
              <span className="text-sm font-semibold text-[#9C2454]">Edit listing →</span>
            </Link>
          );
        })}
        {(data ?? []).length === 0 && <p className="rounded-xl border border-dashed border-[#D9D5CF] bg-white p-10 text-center text-sm text-[#6B6A78]">No properties in this section yet.</p>}
      </div>
      <p className="text-xs text-[#777582]">Showing up to 100 most recently updated listings. Owner details are available only in the listing editor.</p>
    </div>
  );
}
