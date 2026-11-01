import Link from "next/link";
import { createSaleNeighborhood } from "@/app/admin/sales/actions";
import { getSaleLocationOptions } from "@/app/lib/sale-properties";

export default async function AdminSaleLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ created }, locations] = await Promise.all([
    searchParams,
    getSaleLocationOptions(),
  ]);
  const counties = new Map(
    locations.filter((location) => location.level === "county").map((county) => [county.id, county.name]),
  );
  const towns = locations.filter((location) => location.level === "town");
  const townById = new Map(towns.map((town) => [town.id, town]));
  const neighborhoods = locations
    .filter((location) => location.level === "neighborhood")
    .sort((first, second) => first.name.localeCompare(second.name));
  const inputStyle =
    "mt-1 w-full rounded-lg border border-[#D9D5CF] bg-white px-3 py-2.5 text-sm text-[#1B1A2E] outline-none focus:border-[#9C2454] focus:ring-2 focus:ring-[#9C2454]/15";

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D9D5CF] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9C2454]">Property sales</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#1B1A2E]">Manage neighborhoods</h1>
          <p className="mt-1 text-sm text-[#5F5D69]">Add a neighborhood under an existing town; it will immediately be available in listing forms.</p>
        </div>
        <Link href="/admin/sales" className="text-sm font-semibold text-[#9C2454] underline">Back to inventory</Link>
      </header>

      <section className="rounded-xl border border-[#E6E2DC] bg-white p-4 sm:p-6">
        <h2 className="font-semibold text-[#1B1A2E]">Add neighborhood</h2>
        {created === "1" && (
          <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Neighborhood added. It is now available in the sale-property form.
          </p>
        )}
        <form action={createSaleNeighborhood} className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-sm font-medium text-[#383746]">
            Town
            <select name="town_id" required defaultValue="" className={inputStyle}>
              <option value="" disabled>Select a town</option>
              {towns.map((town) => (
                <option key={town.id} value={town.id}>
                  {counties.get(town.parent_id ?? "") ?? "County"} — {town.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-[#383746]">
            Neighborhood
            <input name="name" required minLength={2} maxLength={120} className={inputStyle} placeholder="e.g. Runda" />
          </label>
          <button type="submit" className="min-h-11 rounded-lg bg-[#9C2454] px-4 py-2.5 text-sm font-semibold text-white">
            Add neighborhood
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#E6E2DC] bg-white">
        <div className="border-b border-[#EEEAE5] px-4 py-3">
          <h2 className="font-semibold text-[#1B1A2E]">Current neighborhoods</h2>
        </div>
        <ul className="divide-y divide-[#EEEAE5]">
          {neighborhoods.map((neighborhood) => {
            const town = townById.get(neighborhood.parent_id ?? "");
            return (
              <li key={neighborhood.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-medium text-[#383746]">{neighborhood.name}</span>
                <span className="text-[#6B6A78]">
                  {town ? `${town.name}, ${counties.get(town.parent_id ?? "") ?? "County"}` : "Town unavailable"}
                </span>
              </li>
            );
          })}
          {neighborhoods.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-[#6B6A78]">No neighborhoods yet.</li>
          )}
        </ul>
        <p className="border-t border-[#EEEAE5] px-4 py-3 text-xs text-[#777582]">
          {neighborhoods.length} neighborhood{neighborhoods.length === 1 ? "" : "s"} in the catalogue
        </p>
      </section>
    </div>
  );
}
