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
          {profile.kyc_rejection_reason ?? "Please review and update your host details."}
        </p>
        <Link href="/host/onboarding" className="mt-6 inline-flex rounded-lg bg-[#12231d] px-4 py-3 font-medium text-white hover:bg-[#243c34]">
          Update and resubmit
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_20px_70px_rgba(18,35,29,0.09)]">
      <div className="relative overflow-hidden bg-[#1B1A2E] px-6 py-10 text-center text-white sm:px-12 sm:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -left-20 h-72 w-72 rounded-full border border-white/10" />
        <div className="host-application-success-card relative mx-auto max-w-xl">
          <div className="host-application-success-icon mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#E23E85]/20 ring-1 ring-[#F4A8C6]/40">
            <svg viewBox="0 0 52 52" fill="none" aria-hidden="true" className="h-14 w-14">
              <circle className="host-application-success-circle" cx="26" cy="26" r="23" stroke="#F4A8C6" strokeWidth="2" />
              <path className="host-application-success-check" d="m15 27 7 7 15-16" stroke="#FBE8EF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
            </svg>
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#FBE8EF]">Application received</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">You&apos;re one step closer to hosting</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/75 sm:text-base">
            We&apos;ve received your details. Our team is reviewing your host application, and we&apos;ll update you as soon as there&apos;s news.
          </p>
        </div>
      </div>

      <div className="px-6 py-7 sm:px-12 sm:py-9">
        <div className="mx-auto grid max-w-xl gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#F4D6E2] bg-[#FDF0F5] p-4">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#E23E85] text-sm font-bold text-white" aria-hidden="true">✓</span>
            <h2 className="mt-3 text-sm font-semibold text-[#12231d]">Details received</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">Your application is safely with our team.</p>
          </div>
          <div className="rounded-2xl border border-[#E9E6DD] bg-[#F7F5F2] p-4">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-[#E9E6DD] bg-white text-sm font-bold text-[#6B6A78]" aria-hidden="true">2</span>
            <h2 className="mt-3 text-sm font-semibold text-[#12231d]">Review in progress</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">We&apos;ll let you know when your application has been reviewed.</p>
          </div>
        </div>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/host" className="rounded-xl bg-[#12231d] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#244137]">Back to host dashboard</Link>
          <Link href="/account/support" className="rounded-xl border border-gray-200 px-5 py-3 text-center text-sm font-semibold text-[#12231d] transition hover:bg-gray-50">Contact support</Link>
        </div>
      </div>
    </div>
  );
}
