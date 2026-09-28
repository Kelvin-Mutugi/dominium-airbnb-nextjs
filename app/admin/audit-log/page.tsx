import Link from "next/link";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { formatDate, humanize } from "@/app/lib/format";

const ENTITY_TYPES = ["all", "listing", "booking", "user", "host_verification", "support_case", "review"];

type AuditEntry = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};

function entityHref(entry: AuditEntry) {
  switch (entry.entity_type) {
    case "listing":
      return `/admin/listings/${entry.entity_id}`;
    case "booking":
      return `/admin/bookings/${entry.entity_id}`;
    case "user":
    case "host_verification":
      return `/admin/users/${entry.entity_id}`;
    case "support_case":
      return "/admin/support";
    case "review":
      return "/admin/reviews";
    default:
      return "/admin";
  }
}

function changeDescription(entry: AuditEntry) {
  const before = entry.before_data ?? {};
  const after = entry.after_data ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  if (keys.length === 0) return null;

  return keys.map((key) => {
    const oldValue = before[key];
    const newValue = after[key];
    if (oldValue === newValue) return `${humanize(key)}: ${String(newValue ?? "Not set")}`;
    return `${humanize(key)}: ${String(oldValue ?? "Not set")} → ${String(newValue ?? "Not set")}`;
  }).join(" · ");
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; q?: string }>;
}) {
  const params = await searchParams;
  const entity = ENTITY_TYPES.includes(params.entity ?? "all") ? params.entity ?? "all" : "all";
  const query = (params.q ?? "").trim().slice(0, 100).replace(/[%,()]/g, "");
  const admin = getSupabaseAdmin();

  let auditQuery = admin
    .from("admin_audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, summary, before_data, after_data, created_at");

  if (entity !== "all") auditQuery = auditQuery.eq("entity_type", entity);
  if (query) {
    const pattern = `%${query}%`;
    const matches = [`action.ilike.${pattern}`, `summary.ilike.${pattern}`];
    if (/^[0-9a-f-]{36}$/i.test(query)) matches.push(`entity_id.eq.${query}`);
    auditQuery = auditQuery.or(matches.join(","));
  }

  const { data, error } = await auditQuery.order("created_at", { ascending: false }).limit(200);
  if (error) {
    throw new Error("Unable to load the admin audit log. Apply the admin audit log migration and try again.");
  }

  const entries = (data ?? []) as AuditEntry[];
  const actorIds = [...new Set(entries.map((entry) => entry.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: profiles, error: profileError } = actorIds.length
    ? await admin.from("profiles").select("id, full_name, business_name").in("id", actorIds)
    : { data: [], error: null };
  if (profileError) throw new Error("Unable to load audit actor details.");

  const actorName = new Map((profiles ?? []).map((profile) => [profile.id, profile.business_name ?? profile.full_name]));

  function hrefFor(nextEntity: string, nextQuery: string) {
    const search = new URLSearchParams();
    if (nextEntity !== "all") search.set("entity", nextEntity);
    if (nextQuery) search.set("q", nextQuery);
    const suffix = search.toString();
    return suffix ? `/admin/audit-log?${suffix}` : "/admin/audit-log";
  }

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Admin audit log</h1>
        <p className="mt-1 text-sm text-gray-600">Review administrator changes to listings, bookings, accounts, reviews, and support cases.</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
        <nav aria-label="Filter audit events by record type" className="flex flex-wrap gap-1">
          {ENTITY_TYPES.map((item) => (
            <Link
              key={item}
              href={hrefFor(item, query)}
              aria-current={entity === item ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm ${entity === item ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {item === "all" ? "All" : humanize(item)}
            </Link>
          ))}
        </nav>
        <form action="/admin/audit-log" className="flex w-full max-w-md gap-2">
          {entity !== "all" && <input type="hidden" name="entity" value={entity} />}
          <label htmlFor="audit-search" className="sr-only">Search audit log</label>
          <input
            id="audit-search"
            name="q"
            type="search"
            maxLength={100}
            defaultValue={params.q ?? ""}
            placeholder="Search action, summary, or record ID"
            className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20"
          />
          <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">Search</button>
          {query && <Link href={hrefFor(entity, "")} className="self-center text-sm text-gray-500 hover:text-gray-900">Clear</Link>}
        </form>
      </div>

      <p className="text-xs text-gray-500">{entries.length} events shown · latest 200</p>
      {entries.length === 0 ? (
        <p className="border-y bg-white px-4 py-12 text-center text-sm text-gray-500">No audit events match this filter.</p>
      ) : (
        <div className="divide-y border-y bg-white">
          {entries.map((entry) => (
            <article key={entry.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{humanize(entry.entity_type)}</span>
                  <span className="text-sm font-semibold text-[#1B1A2E]">{humanize(entry.action)}</span>
                </div>
                <p className="mt-2 text-sm text-gray-700">{entry.summary}</p>
                {changeDescription(entry) && <p className="mt-1 break-words text-xs text-gray-500">{changeDescription(entry)}</p>}
                <Link href={entityHref(entry)} className="mt-2 inline-block text-xs font-medium text-[#CF2F74] hover:underline">
                  Open {humanize(entry.entity_type)} · {entry.entity_id.slice(0, 8)}
                </Link>
              </div>
              <div className="text-xs text-gray-500 sm:text-right">
                <p>{formatDate(entry.created_at, "long")}</p>
                <p className="mt-1">By {entry.actor_id ? actorName.get(entry.actor_id) ?? "Admin account" : "Deleted admin account"}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}