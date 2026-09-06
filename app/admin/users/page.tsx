// app/admin/users/page.tsx
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { UserTabs } from "@/components/admin/users/tabs";
import { UserRowActions } from "@/components/admin/users/user-row-actions";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const role = tab === "hosts" ? "host" : "guest";

  const admin = supabaseAdmin;
  const { data: profiles } = await admin
    .from("profiles")
    .select(
      "id, full_name, phone, role, status, business_name, host_verified_at, created_at"
    )
    .eq("role", role)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Users</h1>
      <p className="text-sm text-gray-600 mb-4">
        Manage guests and hosts, verify hosts, and suspend accounts.
      </p>

      <UserTabs />

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Phone</th>
              {role === "host" && <th className="p-3">Business</th>}
              {role === "host" && <th className="p-3">Verified</th>}
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(profiles ?? []).map((p) => (
              <tr key={p.id}>
                <td className="p-3">{p.full_name}</td>
                <td className="p-3">{p.phone}</td>
                {role === "host" && (
                  <td className="p-3">{p.business_name ?? "—"}</td>
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
                    role={p.role}
                    hostVerifiedAt={p.host_verified_at}
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
    </div>
  );
}