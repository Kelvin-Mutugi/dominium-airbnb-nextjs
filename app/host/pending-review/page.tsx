"use client";

import Link from "next/link";

const heroImages = [
  {
    src: "https://images.unsplash.com/photo-1741991110666-88115e724741?q=80&w=1600&auto=format&fit=crop",
    alt: "Nairobi skyline on a sunny day",
  },
  {
    src: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?q=80&w=1600&auto=format&fit=crop",
    alt: "Bright modern living room interior",
  },
  {
    src: "https://images.unsplash.com/photo-1749930206000-179d0b85aa7e?q=80&w=1600&auto=format&fit=crop",
    alt: "Sleek modern living room",
  },
];

export default function PendingReviewPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-[#f3efe9] font-sans">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden px-12 py-12 text-white">
        <div className="absolute inset-0 bg-black">
          {heroImages.map((img, i) => (
            <img
              key={img.src}
              src={img.src}
              alt={img.alt}
              className="absolute inset-0 h-full w-full object-cover opacity-0"
              style={{
                animation: "hero-fade 18s infinite",
                animationDelay: `${i * 6}s`,
              }}
              onError={(event) => {
                event.currentTarget.src = "/placeholder.svg";
              }}
            />
          ))}
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="relative z-10 animate-rise-in motion-reduce:animate-none">
          <span className="font-display text-[20px] tracking-wide">
            DOMINIUM <span className="text-[#ec1561]">AIRBNB</span>
          </span>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="w-full animate-rise-in motion-reduce:animate-none [animation-delay:180ms]">
            <p className="mb-3 text-sm uppercase tracking-[0.2em] text-[#f7d7a2]">
              Host verification
            </p>
            <h2 className="font-display text-[24px] leading-tight mb-3 tracking-wide">
              Your application is being reviewed.
            </h2>
            <p className="text-[#e4e4e4] text-[14px] leading-relaxed max-w-[34ch]">
              We’ll review your host profile, payout details, and ID information
              before your listings can go live.
            </p>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-center px-6 py-16"
        style={{
          backgroundColor: "#ffffff",
          backgroundImage:
            "radial-gradient(circle, rgba(18, 35, 29, 0.29) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8 animate-rise-in motion-reduce:animate-none">
            <span className="font-display text-[16px] text-[#12231d] tracking-wide">
              DOMINIUM <span className="text-[#ec1561]">AIRBNB</span>
            </span>
          </div>

          <div className="bg-[#ffffff] rounded-[18px] px-8 py-10 border border-[#ece8e2] shadow-[0_20px_50px_rgba(18,35,29,0.06)] animate-rise-in motion-reduce:animate-none [animation-delay:120ms]">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.2em] text-[#ec1561]">
              Application received
            </p>
            <h1 className="font-display text-[26px] text-[#12231d] mb-3 tracking-wide text-center">
              Thanks for applying
            </h1>

            <div className="space-y-4 text-[#4b5850] text-[15px] leading-relaxed">
              <p>
                Thank you for submitting your host details. Our team is reviewing
                your profile and payout information before your listings can go
                live.
              </p>

              <div className="rounded-[12px] border border-[#ece8e2] bg-[#f7f4ef] p-4 text-[14px]">
                We’ll email or notify you once your verification is complete.
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-[3px] bg-[#12231d] px-4 py-3 text-[15px] font-medium text-[#f6f4ee] no-underline transition hover:bg-[#1b2d29]"
              >
                Go back to the website
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-[3px] border border-[#cfd3c9] bg-white px-4 py-3 text-[15px] font-medium text-[#12231d] no-underline transition hover:border-[#ec1561]/50 hover:shadow-[0_6px_16px_rgba(236,21,97,0.12)]"
              >
                Sign in another account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
