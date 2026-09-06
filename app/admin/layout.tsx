// app/admin/layout.tsx — one gate for the whole admin route group
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const signinUrl = new URL(
      "/signin",
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    );
    signinUrl.searchParams.set("redirectTo", "/admin");
    redirect(signinUrl.toString());
  }

  const admin = getSupabaseAdmin();
  const { data: roleRow } = await admin
    .from("admin_roles")
    .select("privilege")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!roleRow?.privilege) notFound();

  return (
    <div className="min-h-screen flex bg-[#f6f6f6]">
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}