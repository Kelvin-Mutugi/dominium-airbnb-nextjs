import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export default async function AdminPage() {
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  function parseCookieHeader(header: string | null | undefined) {
    if (!header) return [];
    return header.split("; ").map((pair) => {
      const idx = pair.indexOf("=");
      const name = idx > -1 ? pair.slice(0, idx) : pair;
      const value = idx > -1 ? pair.slice(idx + 1) : "";
      return { name, value };
    });
  }

  const hdr = await headers();
  const cookieHeader = hdr.get("cookie");
  const cookieArray = parseCookieHeader(cookieHeader);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll: () => cookieArray,
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const signinUrl = new URL(
      "/signin",
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    );
    signinUrl.searchParams.set("redirectTo", "/admin");
    redirect(signinUrl.toString());
  }

  const { data: roleRow } = await supabase
    .from("admin_roles")
    .select("privilege")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!roleRow || roleRow.privilege !== true) {
    // Do not reveal the admin page — render Next.js 404 instead
    notFound();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f6f6f6]">
      <div className="max-w-3xl w-full p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">Admin Dashboard</h1>
        <p className="text-sm text-gray-600 mb-6">
          This area is restricted to users with the <strong>privilege</strong>{" "}
          flag.
        </p>

        <div className="space-y-3">
          <div className="p-4 border rounded">
            Manage users, listings and more.
          </div>
          <div className="p-4 border rounded">
            Audit logs and site settings.
          </div>
        </div>
      </div>
    </main>
  );
}
