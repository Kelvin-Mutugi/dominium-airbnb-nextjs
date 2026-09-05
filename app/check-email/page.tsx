import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f3efe9] px-6 py-16">
      <div className="w-full max-w-md rounded-[18px] border border-[#ece8e2] bg-white p-8 shadow-[0_20px_50px_rgba(18,35,29,0.06)] text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#ec1561]">
          Verify your email
        </p>

        <h1 className="font-display text-[26px] text-[#12231d] mb-3 tracking-wide">
          Check your inbox
        </h1>

        <p className="text-[#4b5850] text-[15px] leading-relaxed">
          We’ve sent a verification link to your email. Once you confirm it, you
          can continue setting up your account.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            href="/signin"
            className="inline-flex w-full items-center justify-center rounded-[3px] bg-[#12231d] px-4 py-3 text-[15px] font-medium text-[#f6f4ee] no-underline transition hover:bg-[#1b2d29]"
          >
            Go to sign in
          </Link>

          <Link
            href="/signup"
            className="inline-flex w-full items-center justify-center rounded-[3px] border border-[#cfd3c9] bg-white px-4 py-3 text-[15px] font-medium text-[#12231d] no-underline transition hover:border-[#ec1561]/50 hover:shadow-[0_6px_16px_rgba(236,21,97,0.12)]"
          >
            Back to sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
