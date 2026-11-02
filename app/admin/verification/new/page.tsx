import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { HostApplicationForm } from "@/components/admin/verification/host-application-form";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function NewHostApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId } = await searchParams;
  if (!userId || !UUID_REGEX.test(userId)) {
    return <HostApplicationForm />;
  }

  const admin = getSupabaseAdmin();
  const [{ data: profile, error: profileError }, { data: authResult, error: authError }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, role, full_name, phone, email, host_verified_at, kyc_status")
      .eq("id", userId)
      .maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);
  if (profileError || authError || !profile || !authResult.user) notFound();

  const canEnterHostDetails =
    profile.role === "guest" ||
    (profile.role === "host" &&
      !profile.host_verified_at &&
      profile.kyc_status !== "pending" &&
      profile.kyc_status !== "approved");
  if (!canEnterHostDetails) notFound();

  return (
    <HostApplicationForm
      existingUser={{
        id: profile.id,
        email: authResult.user.email ?? profile.email ?? "",
        fullName: profile.full_name ?? "",
        phone: profile.phone ?? "",
      }}
    />
  );
}
