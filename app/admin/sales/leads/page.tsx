import Link from "next/link";
import { updateSaleLead } from "@/app/admin/sales/actions";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

const STATUSES = ["all", "new", "contacted", "viewing", "offer", "closed", "lost"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Lead = {
  id: string;
  property_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string;
  interest_type: string | null;
  buyer_funding: string | null;
  timeline: string | null;
  preferred_contact: string | null;
  source: string | null;
  utm_source: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  sale_properties: { title: string; slug: string } | { title: string; slug: string }[] | null;
  lead_status_history: Array<{
    id: string;
    old_status: string | null;
    new_status: string;
    changed_at: string;
    changed_by: string | null;
  }>;
};

function relatedProperty(property: Lead["sale_properties"]) {
  return Array.isArray(property) ? property[0] : property;
}

export default async function AdminSaleLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; property?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? params.status ?? "all"
    : "all";
  const propertyId = params.property && UUID.test(params.property) ? params.property : "";
  const admin = getSupabaseAdmin();
  let query = admin
    .from("leads")
    .select(
      `id, property_id, name, phone, email, message, interest_type, buyer_funding,
       timeline, preferred_contact, source, utm_source, status, assigned_to,
       created_at, updated_at, sale_properties ( title, slug ),
       lead_status_history ( id, old_status, new_status, changed_at, changed_by )`,
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (status !== "all") query = query.eq("status", status);
  if (propertyId) query = query.eq("property_id", propertyId);

  const [{ data, error }, { data: properties, error: propertyError }, { data: agents, error: agentError }] =
    await Promise.all([
      query,
      admin.from("sale_properties").select("id, title").order("title", { ascending: true }).limit(500),
      admin.from("admin_roles").select("user_id, privilege").order("privilege", { ascending: true }),
    ]);
  if (error) throw new Error("Unable to load property sale leads.");
  if (propertyError) throw new Error("Unable to load property filters.");
  if (agentError) throw new Error("Unable to load sales agents.");
  const leads = (data ?? []) as Lead[];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D9D5CF] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9C2454]">Admin only · Buyer leads</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#1B1A2E]">Property sales leads</h1>
          <p className="mt-1 text-sm text-[#5F5D69]">Filter buyer inquiries, assign an agent, and follow the timestamped status history.</p>
        </div>
        <Link href="/admin/sales" className="text-sm font-semibold text-[#9C2454] underline">Back to inventory</Link>
      </header>

      <form action="/admin/sales/leads" className="grid gap-3 rounded-xl border border-[#E6E2DC] bg-white p-4 sm:grid-cols-3">
        <label className="text-sm font-medium text-[#383746]">
          Lead status
          <select name="status" defaultValue={status} className="mt-1 w-full rounded-lg border border-[#D9D5CF] bg-white px-3 py-2.5">
            {STATUSES.map((value) => <option key={value} value={value}>{value === "all" ? "All statuses" : value}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-[#383746]">
          Property
          <select name="property" defaultValue={propertyId} className="mt-1 w-full rounded-lg border border-[#D9D5CF] bg-white px-3 py-2.5">
            <option value="">All properties</option>
            {(properties ?? []).map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
          </select>
        </label>
        <button type="submit" className="self-end rounded-lg bg-[#9C2454] px-4 py-2.5 text-sm font-semibold text-white">Apply filters</button>
      </form>

      <div className="grid gap-4">
        {leads.map((lead) => {
          const property = relatedProperty(lead.sale_properties);
          const history = [...(lead.lead_status_history ?? [])].sort(
            (first, second) => Date.parse(first.changed_at) - Date.parse(second.changed_at),
          );
          return (
            <article key={lead.id} className="rounded-xl border border-[#E6E2DC] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#9C2454]">{lead.status}</p>
                  <h2 className="mt-1 font-semibold text-[#1B1A2E]">{lead.name}</h2>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-[#4B4A5A]">
                    {lead.phone && <a className="text-[#9C2454] underline" href={`tel:${lead.phone}`}>{lead.phone}</a>}
                    {lead.email && <a className="text-[#9C2454] underline" href={`mailto:${lead.email}`}>{lead.email}</a>}
                  </p>
                  {property && <p className="mt-2 text-sm text-[#6B6A78]">Property: <Link className="font-medium text-[#9C2454] underline" href={`/for-sale/${property.slug}`} target="_blank">{property.title}</Link></p>}
                </div>
                <time className="text-xs text-[#777582]" dateTime={lead.created_at}>{new Date(lead.created_at).toLocaleString("en-KE")}</time>
              </div>

              <dl className="mt-3 grid gap-2 text-xs text-[#5F5D69] sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="font-semibold">Interest</dt><dd>{lead.interest_type || "Not specified"}</dd></div>
                <div><dt className="font-semibold">Funding</dt><dd>{lead.buyer_funding || "Not specified"}</dd></div>
                <div><dt className="font-semibold">Timeline</dt><dd>{lead.timeline || "Not specified"}</dd></div>
                <div><dt className="font-semibold">Contact / source</dt><dd>{[lead.preferred_contact, lead.source, lead.utm_source].filter(Boolean).join(" · ") || "Not specified"}</dd></div>
              </dl>
              {lead.message && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#4B4A5A]">{lead.message}</p>}

              <form action={updateSaleLead} className="mt-4 flex flex-wrap items-end gap-3 border-t border-[#EEEAE5] pt-3">
                <input type="hidden" name="id" value={lead.id} />
                <label className="text-sm text-[#5F5D69]">
                  Status
                  <select name="status" defaultValue={lead.status} className="mt-1 block rounded-lg border border-[#D9D5CF] bg-white px-3 py-2">
                    {STATUSES.filter((value) => value !== "all").map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <label className="text-sm text-[#5F5D69]">
                  Assigned agent
                  <select name="assigned_to" defaultValue={lead.assigned_to ?? ""} className="mt-1 block max-w-full rounded-lg border border-[#D9D5CF] bg-white px-3 py-2">
                    <option value="">Unassigned</option>
                    {(agents ?? []).map((agent) => (
                      <option key={agent.user_id} value={agent.user_id}>
                        {agent.privilege} · {agent.user_id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="rounded-lg bg-[#9C2454] px-3 py-2 text-sm font-semibold text-white">Save lead</button>
              </form>

              <section className="mt-4 border-t border-[#EEEAE5] pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#777582]">Status history</h3>
                <ol className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                  {history.map((entry) => (
                    <li key={entry.id} className="text-xs text-[#5F5D69]">
                      <time dateTime={entry.changed_at}>{new Date(entry.changed_at).toLocaleString("en-KE")}</time>
                      <span className="ml-1 font-semibold text-[#1B1A2E]">
                        {entry.old_status ? `${entry.old_status} → ` : ""}{entry.new_status}
                      </span>
                      {entry.changed_by && <span className="ml-1">by {entry.changed_by.slice(0, 8)}</span>}
                    </li>
                  ))}
                </ol>
              </section>
            </article>
          );
        })}
        {leads.length === 0 && <p className="rounded-xl border border-dashed border-[#D9D5CF] bg-white p-10 text-center text-sm text-[#6B6A78]">No leads match these filters.</p>}
      </div>
      <p className="text-xs text-[#777582]">Showing up to 100 most recent leads.</p>
    </div>
  );
}
