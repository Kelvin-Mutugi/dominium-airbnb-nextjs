"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Listing } from "./homeData";

interface FeaturedListingsProps {
  listings: Listing[];
}

export default function FeaturedListings({ listings }: FeaturedListingsProps) {
  return (
    <section id="listings" className="px-[6%] pb-[20px] pt-[40px]">
      <div className="mb-[26px] flex items-baseline justify-between">
        <h2 className="font-display text-[30px] font-normal text-[#36454F]">
          Featured stays
        </h2>

        <a
          href="#all"
          className="text-[14px] font-semibold text-[#E23E85] no-underline"
        >
          View all →
        </a>
      </div>

      {listings.length === 0 ? (
        <p className="text-[15px] text-[#3A3856]/70">
          No listings match that location yet — try a different town.
        </p>
      ) : (
        <div className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
          {listings.map((item: Listing) => (
            <Link
              key={item.id}
              href={`/apartments/${item.id}`}
              className="block max-w-[320px] overflow-hidden rounded-2xl border border-[#E9E6DD] bg-white transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#E89A1C]"
            >
              <article className="relative flex h-full flex-col cursor-pointer">
                <div className="absolute left-[14px] top-[14px] z-10 rounded-md border border-[#E9E6DD] bg-white px-[10px] py-[6px] font-mono text-[12px] tracking-[1px] text-[#1B1A2E]">
                  {item.price}
                </div>

                <img
                  src={item.img}
                  alt={item.name}
                  className="block h-[260px] w-full object-cover"
                />

                <div className="p-[18px]">
                  <h4 className="mb-1 text-[17px] text-[#36454F]">
                    {item.name}
                  </h4>

                  <div className="mb-3 text-[13px] text-[#36454F]/65">
                    {item.loc}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="font-mono text-[15px] font-bold text-[#D3D3D3]">
                      {item.detail}
                    </div>

                    <span
                      onClick={(event: React.MouseEvent) =>
                        event.stopPropagation()
                      }
                      className="flex items-center gap-[6px] rounded-lg bg-[#128C7E] px-[14px] py-[9px] text-[12px] font-semibold text-white no-underline"
                    >
                      <MessageCircle size={13} />
                      WhatsApp
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
