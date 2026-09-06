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
    redirect("/signin?redirectTo=%2Fadmin");
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