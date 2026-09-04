"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { MouseEvent } from "react";
import { Listing } from "./homeData";

interface ListingCardProps {
  item: Listing;
}

export default function ListingCard({ item }: ListingCardProps) {
  const handleWhatsAppClick = (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
  };

  return (
    <Link
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
          <h4 className="mb-1 text-[17px] text-[#36454F]">{item.name}</h4>

          <div className="mb-3 text-[13px] text-[#36454F]/65">{item.loc}</div>

          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-[15px] font-bold text-[#D3D3D3]">
              {item.detail}
            </div>

            <span
              onClick={handleWhatsAppClick}
              className="flex items-center gap-[6px] rounded-lg bg-[#128C7E] px-[14px] py-[9px] text-[12px] font-semibold text-white no-underline"
            >
              <MessageCircle size={13} />
              Reserve
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
