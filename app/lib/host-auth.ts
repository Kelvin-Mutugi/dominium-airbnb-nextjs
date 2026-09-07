// app/lib/host-auth.ts
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export async function requireHost() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin?redirectTo=/host");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, host_verified_at, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "host") redirect("/");
  if (profile.status === "suspended") redirect("/");

  return { user, profile };
}