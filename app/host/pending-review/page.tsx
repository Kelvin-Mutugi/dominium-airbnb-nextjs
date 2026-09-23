import Link from "next/link";

export default function PendingReviewPage() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ec1561]">Application received</p>
      <h1 className="mt-3 text-3xl font-bold text-[#12231d]">Thanks for applying</h1>
      <p className="mx-auto mt-4 max-w-lg leading-7 text-gray-600">
        Our team is reviewing your host profile and payout information. We&apos;ll notify you once verification is complete.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/host" className="rounded-lg bg-[#12231d] px-4 py-3 font-medium text-white">Back to host dashboard</Link>
        <Link href="/" className="rounded-lg border border-gray-200 px-4 py-3 font-medium text-[#12231d]">Go to website</Link>
      </div>
    </div>
  );
}
