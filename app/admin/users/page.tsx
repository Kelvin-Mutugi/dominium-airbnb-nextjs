// app/admin/users/page.tsx
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { UserTabs } from "@/components/admin/users/tabs";
import { UserRowActions } from "@/components/admin/users/user-row-actions";
import { AdminSearchInput } from "@/components/admin/search-input";
import Link from "next/link";

function escapeSearchTerm(value: string) {
  return value.trim().slice(0, 100).replace(/[%,()]/g, "");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const role = tab === "hosts" ? "host" : "guest";
  const searchTerm = escapeSearchTerm(q ?? "");

  const admin = getSupabaseAdmin();
  let profilesQuery = admin
    .from("profiles")
    .select(
      "id, full_name, phone, role, status, business_name, host_verified_at, created_at"
    )
    .eq("role", role);

  if (searchTerm) {
    const pattern = `%${searchTerm}%`;
    const searchFields = [
      `full_name.ilike.${pattern}`,
      `phone.ilike.${pattern}`,
      `business_name.ilike.${pattern}`,
    ];
    if (isUuid(searchTerm)) searchFields.push(`id.eq.${searchTerm}`);
    profilesQuery = profilesQuery.or(searchFields.join(","));
  }

  const { data: profiles } = await profilesQuery.order("created_at", {
    ascending: false,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1 text-[#E23E85]">Users</h1>
      <p className="text-sm text-gray-600 mb-4">
        Manage guests and hosts, review host verification, and suspend accounts.
      </p>

      <AdminSearchInput placeholder="Search by name, phone, business, or ID" />
      <UserTabs />

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Mobile number</th>
              {role === "host" && <th className="p-3">Business</th>}
              {role === "host" && <th className="p-3">Verified</th>}
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(profiles ?? []).map((p) => (
              <tr key={p.id}>
                <td className="p-3">
                  <Link
                    href={`/admin/users/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#1B1A2E] hover:text-[#E23E85]"
                  >
                    {p.full_name ?? "Unnamed user"}
                  </Link>
                </td>
                <td className="p-3 text-[#1B1A2E]">{p.phone ?? "—"}</td>
                {role === "host" && (
                  <td className="p-3 text-[#1B1A2E]">{p.business_name ?? "—"}</td>
                )}
                {role === "host" && (
                  <td className="p-3">
                    {p.host_verified_at ? (
                      <span className="text-green-600">Verified</span>
                    ) : (
                      <span className="text-gray-400">Unverified</span>
                    )}
                  </td>
                )}
                <td className="p-3 capitalize">
                  <span
                    className={
                      p.status === "suspended"
                        ? "text-red-600"
                        : "text-gray-700"
                    }
                  >
                    {p.status}
                  </span>
                </td>
                <td className="p-3">
                  <UserRowActions
                    userId={p.id}
                    status={p.status}
                  />
                </td>
              </tr>
            ))}
            {(profiles ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400">
                  No {role}s found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <div className="divide-y divide-gray-100 md:hidden">
          {(profiles ?? []).map((p) => (
            <article key={p.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/admin/users/${p.id}`}
                  className="min-w-0 break-words font-semibold text-[#1B1A2E] hover:text-[#E23E85]"
                >
                  {p.full_name ?? "Unnamed user"}
                </Link>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                    p.status === "suspended"
                      ? "bg-red-50 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="min-w-0">
                  <dt className="text-xs text-gray-500">Mobile number</dt>
                  <dd className="break-words text-[#1B1A2E]">{p.phone ?? "—"}</dd>
                </div>
                {role === "host" && (
                  <div className="min-w-0">
                    <dt className="text-xs text-gray-500">Business</dt>
                    <dd className="break-words text-[#1B1A2E]">
                      {p.business_name ?? "—"}
                    </dd>
                  </div>
                )}
                {role === "host" && (
                  <div>
                    <dt className="text-xs text-gray-500">Verification</dt>
                    <dd className={p.host_verified_at ? "text-green-700" : "text-gray-500"}>
                      {p.host_verified_at ? "Verified" : "Unverified"}
                    </dd>
                  </div>
                )}
              </dl>
              <UserRowActions userId={p.id} status={p.status} />
            </article>
          ))}
          {(profiles ?? []).length === 0 && (
            <p className="p-6 text-center text-sm text-gray-400">
              No {role}s found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}