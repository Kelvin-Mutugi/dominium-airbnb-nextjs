"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, ShieldCheck, CreditCard, ChevronDown } from "lucide-react";
import white_logo from "@/app/assets/logo3.png";

// ...keep FacebookIcon, InstagramIcon, YouTubeIcon, TikTokIcon exactly as they are

const COUNTIES = ["Nairobi", "Mombasa", "Kilifi", "Nakuru", "Kisumu", "Kiambu"];

const COLUMNS = [
  {
    title: "Explore",
    links: [
      ...COUNTIES.map((c) => ({
        label: c,
        href: `/allListings?location=${encodeURIComponent(c)}`,
      })),
      { label: "All listings", href: "/allListings" },
    ],
  },
  {
    title: "For guests",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Help center", href: "/help" },
      { label: "Cancellation options", href: "/cancellation" },
      { label: "Safety information", href: "/safety" },
    ],
  },
  {
    title: "For hosts",
    links: [
      { label: "List your property", href: "/host/onboarding" },
      { label: "Host panel", href: "/host" },
      { label: "Host resources", href: "/host/resources" },
      { label: "Responsible hosting", href: "/host/guidelines" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/aboutPage" },
      { label: "Contact", href: "/contactus" },
      { label: "Careers", href: "/careers" },
      { label: "Blog", href: "/blog" },
    ],
  },
];

const LEGAL_LINKS = [
  { label: "Guest Terms", href: "/legal/guest-terms-of-service" },
  { label: "Guest Privacy", href: "/legal/guest-privacy-policy" },
  { label: "Host Privacy", href: "/legal/host-privacy-policy" },
  { label: "Refund policy", href: "/legal/refund-cancellation-policy" },
  { label: "Host Agreement", href: "/legal/host-listing-agreement-and-terms-of-service" },
];

const linkClass = "text-sm text-neutral-400 no-underline transition-colors hover:text-white";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0b0a14] text-neutral-300">
      <div className="px-4 py-8 sm:px-[6%] sm:py-10">
        {/* Brand row */}
        <div className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between sm:pb-8">
          <div className="max-w-md">
            <Link href="/" aria-label="Dominium Premium Stays, home">
              <Image src={white_logo} alt="" width={160} height={46} className="h-10 w-auto object-contain" />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              Short-term stays across Kenya, with verified hosts and secure payments.
            </p>
          </div>

          <div className="flex items-center gap-4 text-neutral-400">
            <a href="https://www.facebook.com/profile.php?id=61594166234805" target="_blank" aria-label="Facebook" className="transition-colors hover:text-white">
              Facebook
            </a>
            <a href="https://www.instagram.com/dominiumbnb?stkn=MWt0M3hnY2MzZ2c2eQ==" target="_blank" aria-label="Instagram" className="transition-colors hover:text-white">
              Instagram
            </a>
            <a href="https://www.youtube.com/@Dominiumbnb" target="_blank" aria-label="YouTube" className="transition-colors hover:text-white">
              YouTube
            </a>
            <a href="https://www.tiktok.com/@dominium.bnb?_r=1&_t=ZS-9A3yTdUst2i" target="_blank" aria-label="TikTok" className="transition-colors hover:text-white">
              TikTok
            </a>
          </div>
        </div>

        {/* Link columns: accordions on phones, grid from sm up */}
        <div className="divide-y divide-white/10 sm:grid sm:grid-cols-2 sm:gap-8 sm:divide-y-0 sm:py-8 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <FooterColumn key={col.title} title={col.title} links={col.links} />
          ))}
        </div>

        {/* Contact + trust, one compact row */}
        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-neutral-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
          <a href="mailto:support@dominiumairbnb.co.ke" className="flex items-center gap-2 no-underline hover:text-white">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="break-all">support@dominiumairbnb.co.ke</span>
          </a>
          <a href="tel:0183191903" className="flex items-center gap-2 no-underline hover:text-white">
            <Phone className="h-4 w-4 shrink-0" />
            0183191903
          </a>
          <span className="flex items-center gap-2 text-neutral-500">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Verified hosts, secure payments
          </span>
          <span className="flex items-center gap-2 text-neutral-500">
            <CreditCard className="h-4 w-4 shrink-0" />
            M-Pesa supported
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 px-4 py-5 sm:px-[6%]">
        <div className="flex flex-col-reverse gap-3 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Dominium Premium Stays. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="no-underline transition-colors hover:text-white">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  const list = (
    <ul className="mt-3 space-y-2.5 sm:mt-4">
      {links.map((l) => (
        <li key={l.href + l.label}>
          <Link href={l.href} className={linkClass}>
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* Phones: native accordion, no JS */}
      <details className="group py-4 sm:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-wide text-white">
          {title}
          <ChevronDown className="h-4 w-4 text-neutral-500 transition group-open:rotate-180" />
        </summary>
        {list}
      </details>

      {/* sm and up: always open */}
      <div className="hidden sm:block">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white">{title}</h3>
        {list}
      </div>
    </>
  );
}