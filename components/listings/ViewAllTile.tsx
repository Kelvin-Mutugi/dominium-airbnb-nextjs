"use client";

import Link from "next/link";

type ViewAllTileProps = {
  location: string;
};

export default function ViewAllTile({ location }: ViewAllTileProps) {
  const href = `/allListings?${new URLSearchParams({ location }).toString()}`;

  return (
    <Link
      href={href}
      className="view-all-tile group relative flex h-[225px] w-[225px] shrink-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-[#E9E6DD] bg-[#F7F7F7] text-center text-[#36454F] transition-colors hover:border-[#36454F]"
    >
      <span className="shimmer pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent" />

      <span className="arrow relative flex h-12 w-12 items-center justify-center rounded-full bg-[#36454F] text-white transition-transform duration-300 group-hover:scale-110">
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

      <span className="relative px-4">
        <span className="block text-base font-semibold">View all</span>
        <span className="block text-sm text-[#36454F]/70">
          stays in {location}
        </span>
      </span>

      <style jsx>{`
        .view-all-tile {
          animation: tileIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .shimmer {
          animation: tileShimmer 3.2s ease-in-out 0.8s infinite;
        }
        .arrow {
          animation: tileNudge 1.8s ease-in-out infinite;
        }
        @keyframes tileIn {
          from {
            opacity: 0;
            transform: translateX(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes tileShimmer {
          0% {
            transform: translateX(0);
          }
          60%,
          100% {
            transform: translateX(450%);
          }
        }
        @keyframes tileNudge {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(5px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .view-all-tile,
          .shimmer,
          .arrow {
            animation: none;
          }
        }
      `}</style>
    </Link>
  );
}