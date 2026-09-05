export default function PendingReviewPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#12231d] px-6 py-12 text-[#f6f4ee]">
      <div className="w-full max-w-lg rounded-sm border border-white/10 bg-[#1a2d28] p-8 text-center shadow-lg">
        <p className="mb-3 text-sm uppercase tracking-[0.18em] text-[#d9b46d]">
          Host verification
        </p>
        <h1 className="font-serif text-4xl text-white">Application received</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-white/80">
          Thanks for submitting your host details. Our team is reviewing your
          profile and payout information before your listings can go live.
        </p>
        <p className="mt-6 text-sm text-white/70">
          We’ll be in touch once the review is complete.
        </p>
      </div>
    </main>
  );
}
