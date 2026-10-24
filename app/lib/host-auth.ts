// app/lib/host-auth.ts
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export async function requireHost() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin?redirectTo=/host");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, host_verified_at, kyc_status, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw new Error("Unable to check host account status.");
  if (!profile || profile.role !== "host") redirect("/host/onboarding");
  if (profile.status === "suspended") redirect("/");
  if (!profile.host_verified_at && profile.kyc_status !== "approved") {
    redirect(
      profile.kyc_status === "pending"
        ? "/host/pending-review"
        : "/host/onboarding",
    );
  }

  return { user, profile };
}