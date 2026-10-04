"use client";

import Link from "next/link";

type ViewAllCardProps = {
  location: string;
  total?: number;
};

export default function ViewAllCard({ location, total }: ViewAllCardProps) {
  const href = `/allListings?${new URLSearchParams({ location }).toString()}`;

  return (
    <Link
      href={href}
      className="view-all-card group relative mt-6 flex w-full items-center justify-between overflow-hidden border border-[#E9E6DD] bg-[#F7F7F7] px-6 py-7 text-[#36454F] transition-colors hover:border-[#36454F]"
    >
      {/* Shimmer sweep */}
      <span className="shimmer pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent" />

      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-widest text-[#36454F]/60">
          You&apos;ve reached the end
        </p>

        <h3 className="mt-1 text-lg font-semibold">
          View all listings in {location}
        </h3>

        {typeof total === "number" && (
          <p className="mt-0.5 text-sm text-[#36454F]/70">
            Explore the full collection of stays
          </p>
        )}
      </div>

      <span className="arrow relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#36454F] text-white transition-transform duration-300 group-hover:scale-110">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>

      <style jsx>{`
        .view-all-card {
          animation: viewAllIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .shimmer {
          animation: viewAllShimmer 3.2s ease-in-out 0.8s infinite;
        }

        .arrow {
          animation: viewAllNudge 1.8s ease-in-out infinite;
        }

        @keyframes viewAllIn {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes viewAllShimmer {
          0% {
            transform: translateX(0);
          }
          60%,
          100% {
            transform: translateX(450%);
          }
        }

        @keyframes viewAllNudge {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(5px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .view-all-card,
          .shimmer,
          .arrow {
            animation: none;
          }
        }
      `}</style>
    </Link>
  );
}