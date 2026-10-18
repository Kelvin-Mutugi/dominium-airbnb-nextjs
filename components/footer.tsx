"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import white_logo from "@/app/assets/logo3.png";

const INK = "#2B0715";
const LAVENDER = "#E8DEFF";
const RASPBERRY = "#D61A6B";

const COUNTIES = ["Nairobi", "Mombasa", "Kilifi", "Nakuru", "Kisumu", "Kiambu"];

/* Tiny pencil icons, 40x40. `ft-acc` strokes take the raspberry accent. */
const ICONS: Record<string, ReactNode> = {
  explore: (
    <g>
      <circle cx="20" cy="20" r="14" />
      <path d="M20 6 v3 M20 31 v3 M6 20 h3 M31 20 h3" />
      <path className="ft-acc" d="M27 13 L22 22 L13 27 L18 18 Z" />
    </g>
  ),
  guests: (
    <g>
      <path d="M7 14 h26 v18 h-26 z M15 14 v-5 h10 v5" />
      <path className="ft-acc" d="M7 23 h26" />
      <path d="M14 14 v18 M26 14 v18" opacity=".45" />
    </g>
  ),
  hosts: (
    <g>
      <circle className="ft-acc" cx="13" cy="20" r="7" />
      <circle cx="13" cy="20" r="2" />
      <path d="M20 20 H35 M29 20 v6 M34 20 v4" />
    </g>
  ),
  company: (
    <g>
      <path d="M7 33 L9 24 L27 6 L34 13 L16 31 Z" />
      <path className="ft-acc" d="M23 10 L30 17" />
      <path d="M9 24 L16 31" />
    </g>
  ),
  mail: (
    <g>
      <path d="M5 10 h30 v22 h-30 z" />
      <path className="ft-acc" d="M5 10 l15 12 l15 -12" />
    </g>
  ),
  phone: (
    <g>
      <path d="M12 6 h6 l3 8 l-4 3 c2 5 5 8 10 10 l3 -4 l8 3 v6 c0 3 -3 5 -6 5 C18 37 4 23 6 12 c0 -3 3 -6 6 -6 z" />
      <path className="ft-acc" d="M26 8 c4 1 6 4 7 8" />
    </g>
  ),
  shield: (
    <g>
      <path d="M20 5 L33 10 V20 C33 28 27 34 20 37 C13 34 7 28 7 20 V10 Z" />
      <path className="ft-acc" d="M13 20 l5 5 l9 -10" />
    </g>
  ),
  card: (
    <g>
      <path d="M5 10 h30 v22 h-30 z M5 17 h30 M5 21 h30 M10 28 h8" />
      <path className="ft-acc" d="M26 28 h5" />
    </g>
  ),
  chevron: <path d="M10 15 l10 10 l10 -10" />,
};

const COLUMNS = [
  {
    title: "Explore",
    icon: "explore",
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
    icon: "guests",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Help center", href: "/help" },
      { label: "Cancellation options", href: "/cancellation" },
      { label: "Safety information", href: "/safety" },
    ],
  },
  {
    title: "For hosts",
    icon: "hosts",
    links: [
      { label: "List your property", href: "/host/onboarding" },
      { label: "Host panel", href: "/host" },
      { label: "Host resources", href: "/host/resources" },
      { label: "Responsible hosting", href: "/host/guidelines" },
    ],
  },
  {
    title: "Company",
    icon: "company",
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

const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61594166234805" },
  { label: "Instagram", href: "https://www.instagram.com/dominiumbnb?stkn=MWt0M3hnY2MzZ2c2eQ==" },
  { label: "YouTube", href: "https://www.youtube.com/@Dominiumbnb" },
  { label: "TikTok", href: "https://www.tiktok.com/@dominium.bnb?_r=1&_t=ZS-9A3yTdUst2i" },
];

/* Links get a hand-drawn wavy underline on hover */
const linkClass =
  "font-serif text-[15px] text-[#E8DEFF]/75 no-underline underline-offset-[5px] decoration-[#D61A6B] decoration-2 transition-colors hover:text-white hover:underline hover:decoration-wavy";

const STYLES = `
  .ft-ico .ft-acc,.ft-pan .ft-acc{stroke:${RASPBERRY}}
  .ft-pan :is(path,line,rect,circle,ellipse){stroke-dasharray:1400;stroke-dashoffset:1400}
  .ft-in .ft-pan :is(path,line,rect,circle,ellipse){
    animation:ft-draw 2s cubic-bezier(.5,0,.2,1) forwards;
    animation-delay:calc(var(--i) * .45s);
  }
  .ft-rule{stroke-dasharray:1;stroke-dashoffset:1}
  .ft-in .ft-rule{animation:ft-draw 1.1s ease-out forwards;animation-delay:calc(var(--i) * .3s + 1s)}
  @keyframes ft-draw{to{stroke-dashoffset:0}}
  @media (prefers-reduced-motion:reduce){
    .ft-pan :is(path,line,rect,circle,ellipse){stroke-dasharray:none;stroke-dashoffset:0;animation:none!important}
    .ft-rule{stroke-dashoffset:0;animation:none!important}
  }
`;

/* A wobbly pencil rule that draws itself across */
function Rule({ i = 0, className = "" }: { i?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 400 8"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`pointer-events-none h-2 w-full ${className}`}
      style={{ filter: "url(#ft-pencil)", ["--i" as string]: i } as CSSProperties}
    >
      <path
        className="ft-rule"
        pathLength={1}
        d="M0 4 C 60 1 90 7 150 4 S 260 1 320 5 S 380 3 400 4"
        fill="none"
        stroke={LAVENDER}
        strokeOpacity={0.3}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Ico({ name, className = "size-6" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ft-ico shrink-0 ${className}`}
      style={{ filter: "url(#ft-pencil)" }}
    >
      {ICONS[name]}
    </svg>
  );
}

/* One long ground line carries the whole of Kenya: Mount Kenya, an acacia,
   Nairobi's KICC tower, a Lamu dhow, a coastal palm and the sun. */
const PANORAMA = (
  <g strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" stroke={LAVENDER}>
    <g style={{ "--i": 0 } as CSSProperties}>
      <path d="M0 150 H1200" />
      <path d="M50 150 l-3 -8 M56 150 l1 -9 M300 150 l-2 -7 M306 150 l2 -9 M700 150 l-2 -7 M880 150 l1 -8 M886 150 l3 -9 M1060 150 l-2 -7 M1066 150 l3 -9 M1150 150 l-2 -8" />
    </g>
    {/* Mount Kenya */}
    <g style={{ "--i": 0 } as CSSProperties}>
      <path d="M20 150 L90 70 L112 86 L146 24 L180 78 L202 66 L270 150" />
      <path className="ft-acc" d="M146 24 L128 62 L141 54 L150 72 L162 54 L180 78" />
      <path d="M146 24 V110 M110 122 l18 -36 M190 126 l-14 -42" opacity=".35" />
      <path d="M284 150 v-14 M277 150 l7 -18 l7 18 M300 150 v-10 M294 150 l6 -16 l6 16" />
    </g>
    {/* Acacia */}
    <g style={{ "--i": 1 } as CSSProperties}>
      <path d="M326 76 C356 48 416 42 446 56 C476 40 516 52 528 78 C504 68 478 72 462 78 C436 66 386 68 326 76 Z" />
      <path d="M404 150 C408 122 404 98 396 72 M436 150 C432 124 434 100 440 70 M420 124 C436 108 452 98 468 90" />
      <path d="M350 80 l-3 10 M380 76 l-2 12 M480 80 l-2 11 M504 80 l-4 9" opacity=".4" />
    </g>
    {/* Nairobi */}
    <g style={{ "--i": 2 } as CSSProperties}>
      <rect x="590" y="60" width="22" height="90" />
      <path className="ft-acc" d="M590 60 L601 24 L612 60 M584 60 H618" />
      <path d="M601 24 V8 M596 70 V150 M606 70 V150" />
      <rect x="540" y="100" width="36" height="50" />
      <rect x="626" y="84" width="30" height="66" />
      <rect x="664" y="112" width="26" height="38" />
      <path d="M547 110 h6 M559 110 h6 M547 122 h6 M559 122 h6 M547 134 h6 M559 134 h6 M633 94 h5 M645 94 h5 M633 106 h5 M645 106 h5 M633 118 h5 M645 118 h5 M633 130 h5 M645 130 h5 M671 122 h4 M679 122 h4 M671 134 h4 M679 134 h4" />
    </g>
    {/* Lamu dhow */}
    <g style={{ "--i": 3 } as CSSProperties}>
      <path d="M742 130 H862 L848 146 H756 Z M802 130 V58" />
      <path className="ft-acc" d="M802 62 L850 124 H802 Z" />
      <path d="M798 78 L764 124 H798" />
      <path d="M730 150 q8 -5 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" />
    </g>
    {/* Coastal palm */}
    <g style={{ "--i": 4 } as CSSProperties}>
      <path d="M930 150 C934 120 944 92 958 66" />
      <path d="M958 66 C940 54 920 58 906 74 M958 66 C946 46 926 42 910 46 M958 66 C970 48 992 46 1008 56 M958 66 C978 66 996 76 1004 94 M958 66 C956 50 962 38 976 30" />
      <circle cx="952" cy="72" r="4" />
      <circle cx="963" cy="74" r="4" />
    </g>
    {/* Sun and birds */}
    <g style={{ "--i": 5 } as CSSProperties}>
      <circle className="ft-acc" cx="1100" cy="46" r="16" />
      <path className="ft-acc" d="M1100 16 v6 M1100 70 v6 M1070 46 h6 M1124 46 h6 M1079 25 l4 4 M1121 67 l-4 -4 M1121 25 l-4 4 M1079 67 l4 -4" />
      <path d="M200 28 q6 -8 12 0 q6 -8 12 0 M476 22 q5 -7 10 0 q5 -7 10 0 M830 30 q5 -7 10 0 q5 -7 10 0" />
    </g>
  </g>
);

export default function Footer() {
  const year = new Date().getFullYear();
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  // The panorama and rules draw themselves once, when the footer first scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <footer
      ref={ref}
      className={`relative text-[#E8DEFF] ${seen ? "ft-in" : ""}`}
      style={{
        backgroundColor: INK,
        backgroundImage: `linear-gradient(${LAVENDER}0D 1px, transparent 1px), linear-gradient(90deg, ${LAVENDER}0D 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    >
      <style>{STYLES}</style>

      {/* Shared pencil wobble */}
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <filter id="ft-pencil" x="-5%" y="-30%" width="110%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="9" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
          </filter>
        </defs>
      </svg>

      {/* Panorama of Kenya, standing on the footer's top edge */}
      <div
        aria-hidden="true"
        className="flex h-24 justify-center overflow-hidden border-b border-[#E8DEFF]/25 pt-2 sm:h-32 lg:h-40"
      >
        <svg
          viewBox="0 0 1200 160"
          className="ft-pan h-full w-auto shrink-0"
          style={{ filter: "url(#ft-pencil) drop-shadow(1.5px 1.5px 0 rgba(0,0,0,.35))" }}
        >
          {PANORAMA}
        </svg>
      </div>

      <div className="px-4 py-8 sm:px-[6%] sm:py-12">
        {/* Brand row */}
        <div className="flex flex-col gap-5 pb-6 sm:flex-row sm:items-center sm:justify-between sm:pb-8">
          <div className="max-w-md">
            <Link href="/" aria-label="Dominium Premium Stays, home">
              <Image src={white_logo} alt="" width={160} height={46} className="h-10 w-auto object-contain" />
            </Link>
            <p className="mt-3 font-serif text-base italic leading-relaxed text-[#E8DEFF]/75">
              Short-term stays across Kenya, with verified hosts and secure payments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className={linkClass}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <Rule i={0} />

        {/* Link columns: accordions on phones, grid from sm up */}
        <div className="sm:grid sm:grid-cols-2 sm:gap-8 sm:py-9 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <FooterColumn key={col.title} title={col.title} icon={col.icon} links={col.links} />
          ))}
        </div>

        <Rule i={1} />

        {/* Contact + trust, one compact row */}
        <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
          <a href="mailto:support@dominiumairbnb.co.ke" className={`flex items-center gap-2.5 ${linkClass}`}>
            <Ico name="mail" className="size-6 text-[#E8DEFF]" />
            <span className="break-all">support@dominiumairbnb.co.ke</span>
          </a>
          <a href="tel:0183191903" className={`flex items-center gap-2.5 ${linkClass}`}>
            <Ico name="phone" className="size-6 text-[#E8DEFF]" />
            0183191903
          </a>
          <span className="flex items-center gap-2.5 font-serif text-[15px] italic text-[#E8DEFF]/60">
            <Ico name="shield" className="size-6 text-[#E8DEFF]/80" />
            Verified hosts, secure payments
          </span>
          <span className="flex items-center gap-2.5 font-serif text-[15px] italic text-[#E8DEFF]/60">
            <Ico name="card" className="size-6 text-[#E8DEFF]/80" />
            M-Pesa supported
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-4 pb-6 sm:px-[6%]">
        <Rule i={2} />
        <div className="flex flex-col-reverse gap-3 pt-5 font-serif text-[13px] text-[#E8DEFF]/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Dominium Premium Stays. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="no-underline underline-offset-4 decoration-[#D61A6B] decoration-2 transition-colors hover:text-white hover:underline hover:decoration-wavy"
              >
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
  icon,
  links,
}: {
  title: string;
  icon: string;
  links: { label: string; href: string }[];
}) {
  const list = (
    <ul className="mt-3 space-y-2.5 sm:mt-5">
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
      <details className="group relative py-4 sm:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between font-serif text-lg font-medium text-white">
          <span className="flex items-center gap-3">
            <Ico name={icon} className="size-7 text-[#E8DEFF]" />
            {title}
          </span>
          <Ico name="chevron" className="size-5 text-[#E8DEFF]/60 transition group-open:rotate-180" />
        </summary>
        {list}
        <Rule className="absolute inset-x-0 bottom-0" />
      </details>

      {/* sm and up: always open */}
      <div className="hidden sm:block">
        <h3 className="flex items-center gap-3 font-serif text-xl font-medium tracking-tight text-white">
          <Ico name={icon} className="size-7 text-[#E8DEFF]" />
          {title}
        </h3>
        {list}
      </div>
    </>
  );
}