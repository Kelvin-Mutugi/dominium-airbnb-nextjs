// app/host/page.tsx
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";

export default async function HostDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, town, county, status, price_per_night")
    .order("created_at", { ascending: false });

  const statusColor: Record<string, string> = {
    draft: "text-gray-500",
    pending_review: "text-amber-600",
    published: "text-green-600",
    archived: "text-gray-400",
    suspended: "text-red-600",
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1 text-[#E23E85]">My Listings</h1>
      <p className="text-sm text-gray-600 mb-6">
        Manage your properties and track their review status.
      </p>

      <div className="bg-white rounded-lg shadow-sm divide-y">
        {(listings ?? []).map((l) => (
          <Link
            key={l.id}
            href={`/host/listings/${l.id}/edit`}
            className="p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div>
              <p className="font-medium text-[#1f2937]">{l.title}</p>
              <p className="text-xs text-gray-400">
                {l.town}, {l.county} · KES{" "}
                {Number(l.price_per_night).toLocaleString()}/night
              </p>
            </div>
            <span className={`text-sm capitalize ${statusColor[l.status]}`}>
              {l.status.replace("_", " ")}
            </span>
          </Link>
        ))}
        {(listings ?? []).length === 0 && (
          <p className="p-6 text-center text-gray-400">
            No listings yet —{" "}
            <Link href="/host/listings/new" className="underline">
              add your first one
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}