import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export default async function PendingReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin?redirectTo=/host/pending-review");

  const { data: profile } = await supabase
    .from("profiles")
    .select("kyc_status, kyc_rejection_reason, host_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.host_verified_at || profile?.kyc_status === "approved") redirect("/host");
  if (profile?.kyc_status === "rejected") {
    return (
      <div className="mx-auto max-w-2xl border-l-4 border-rose-500 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Changes requested</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#12231d]">Your application needs an update</h1>
        <p className="mt-3 leading-7 text-gray-600">
          {profile.kyc_rejection_reason ?? "Please review your host details and upload a clear identity document."}
        </p>
        <Link href="/host/onboarding" className="mt-6 inline-flex rounded-lg bg-[#12231d] px-4 py-3 font-medium text-white hover:bg-[#243c34]">
          Update and resubmit
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ec1561]">Application received</p>
      <h1 className="mt-3 text-3xl font-bold text-[#12231d]">Thanks for applying</h1>
      <p className="mx-auto mt-4 max-w-lg leading-7 text-gray-600">
        Our team is reviewing your identity and payout details. We&apos;ll update this page when a decision is made.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/host" className="rounded-lg bg-[#12231d] px-4 py-3 font-medium text-white">Back to host dashboard</Link>
        <Link href="/account/support" className="rounded-lg border border-gray-200 px-4 py-3 font-medium text-[#12231d]">Contact support</Link>
      </div>
    </div>
  );
}
