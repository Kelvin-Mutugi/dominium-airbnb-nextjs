// lib/admin-auth.ts
import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const admin = supabaseAdmin;
  const { data: roleRow } = await admin
    .from("admin_roles")
    .select("privilege")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!roleRow?.privilege) notFound();
  return user;
}