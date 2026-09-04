"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, MessageCircle } from "lucide-react";

interface NavLink {
  label: string;
  href: string;
}

const LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Listings", href: "/#listings" },
  { label: "Booking Process", href: "/#booking_process" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Blog", href: "/blog" },
];

export default function Navbar() {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <div className="sticky top-0 z-[100] font-sans">
      <nav className="flex items-center justify-between gap-5 px-[6%] py-4 bg-white border-b border-[#E9E6DD]">
        {/* Logo */}
        <div className="font-display text-xl tracking-wide text-[#36454F] whitespace-nowrap shrink-0 max-[380px]:text-[17px]">
          DOMINIUM<span className="text-[#E23E85]"> AIRBNB</span>
        </div>

        {/* Desktop links */}
        <ul className="hidden min-[681px]:flex items-center gap-8 max-[900px]:gap-5 list-none m-0 p-0">
          {LINKS.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="text-sm font-medium text-[#3A3856] hover:text-[#1B1A2E] no-underline transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <Link
          href="#contact"
          className="hidden min-[681px]:flex items-center gap-2 bg-[#128C7E] text-white text-[13px] font-semibold px-[18px] py-[10px] rounded-lg no-underline whitespace-nowrap shrink-0"
        >
          <MessageCircle size={14} />
          WhatsApp Us
        </Link>

        {/* Mobile toggle */}
        <button
          className="hidden max-[680px]:inline-flex bg-transparent border-none text-[#1B1A2E] cursor-pointer p-1 shrink-0"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="hidden max-[680px]:flex flex-col gap-0.5 bg-white border-b border-[#E9E6DD] px-[6%] pb-5 pt-2">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-[#3A3856] no-underline py-[14px] px-1 text-[15px] border-b border-[#E9E6DD]"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="#contact"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 bg-[#128C7E] text-white text-[13px] font-semibold px-[18px] py-[14px] rounded-lg no-underline mt-2.5"
          >
            <MessageCircle size={14} />
            WhatsApp Us
          </Link>
        </div>
      )}
    </div>
  );
}