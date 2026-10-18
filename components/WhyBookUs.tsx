"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const INK = "#2B0715";
const PENCIL = "#5A3A47";
const RASPBERRY = "#D61A6B";
const LAVENDER = "#E8DEFF";

/* 120x120 line drawings. `bp-acc` takes the accent colour; `bp-keep` is a
   dashed "motion" line that fades in after the drawing finishes. */
const BENEFITS = [
  {
    title: "Easy to find",
    description:
      "Filter by county, town, price, and dates to land on a stay that fits your trip — from Nairobi apartments to coastal getaways in Diani.",
    // A folded map with a pinned stay and a dashed route
    art: (
      <g>
        <path d="M14 36 L42 26 L74 38 L106 26 V84 L74 96 L42 84 L14 94 Z" />
        <path d="M42 26 V84 M74 38 V96" opacity=".5" />
        <path d="M20 50 l10 -10 M20 62 l18 -18 M20 74 l16 -16 M82 70 l12 -12 M82 82 l20 -20" opacity=".3" />
        <path className="bp-acc" d="M58 56 a14 14 0 1 1 28 0 c0 12 -14 28 -14 28 s-14 -16 -14 -28 z" />
        <circle className="bp-acc" cx="72" cy="56" r="5" />
        <path className="bp-acc bp-keep" d="M20 86 C 30 72 40 90 52 74" />
      </g>
    ),
  },
  {
    title: "Clear and reliable",
    description:
      "Every host is verified before a listing goes live, so what you see is what you book — real photos, real pricing, no surprises.",
    // A photo in a frame with a verified shield
    art: (
      <g>
        <rect x="14" y="26" width="66" height="50" rx="3" />
        <path d="M20 68 L38 48 L50 62 L58 54 L74 68" />
        <circle cx="62" cy="40" r="6" />
        <path d="M20 34 l8 -4 M20 42 l14 -8" opacity=".35" />
        <path className="bp-acc" d="M84 50 L104 57 V76 C104 88 96 96 84 101 C72 96 64 88 64 76 V57 Z" />
        <path className="bp-acc" d="M75 76 l7 7 l12 -14" strokeWidth="3.6" />
        <path d="M70 62 l-4 6 M96 90 l4 -6" opacity=".35" />
      </g>
    ),
  },
  {
    title: "Simple booking",
    description:
      "Confirm and pay for your stay on the platform, then contact customer support for booking and check-in help.",
    // A phone with a chat bubble
    art: (
      <g>
        <rect x="30" y="12" width="46" height="92" rx="8" />
        <path d="M46 20 H60 M53 96 h.1" strokeWidth="3.4" />
        <path d="M38 78 H68 M38 86 H58" opacity=".4" />
        <path
          className="bp-acc"
          d="M54 34 H94 a6 6 0 0 1 6 6 V58 a6 6 0 0 1 -6 6 H78 L66 76 V64 H54 a6 6 0 0 1 -6 -6 V40 a6 6 0 0 1 6 -6 Z"
        />
        <path className="bp-acc" d="M62 49 h.1 M74 49 h.1 M86 49 h.1" strokeWidth="4" />
        <path className="bp-keep" d="M16 40 H26 M12 54 H26 M18 68 H26" />
      </g>
    ),
  },
];

const PIN = (
  <g>
    <path d="M60 14 C 40 14 26 30 26 48 C 26 72 60 102 60 102 S 94 72 94 48 C 94 30 80 14 60 14 Z" />
    <circle className="bp-acc" cx="60" cy="48" r="13" />
    <path d="M38 42 l12 -14 M34 56 l24 -28 M40 68 l22 -26" opacity=".35" />
    <path className="bp-keep" d="M22 108 C 40 100 80 100 98 108" />
  </g>
);

// Acacia, sun and a pair of birds: the left-hand margin sketch
const ACACIA = (
  <g>
    <path d="M44 74 C 60 50 110 40 138 52 C 170 36 232 48 252 76 C 226 64 196 70 172 76 C 146 66 100 68 44 74 Z" />
    <path d="M132 140 C 137 118 134 100 130 76 M148 140 C 144 120 142 100 144 76 M140 110 C 150 98 160 90 176 80" />
    <path d="M70 74 l-4 12 M100 70 l-3 14 M152 74 l-2 12 M192 74 l-3 12 M224 72 l-4 12" opacity=".4" />
    <path d="M16 140 H264 M60 140 l-3 -9 M65 140 l1 -10 M72 140 l4 -8 M196 140 l-2 -8 M202 140 l3 -10 M210 140 l5 -7" />
    <circle className="bp-acc" cx="226" cy="26" r="13" />
    <path
      className="bp-acc"
      d="M226 4 v6 M226 42 v6 M204 26 h6 M242 26 h6 M210 10 l4 4 M242 42 l-4 -4 M242 10 l-4 4 M210 42 l4 -4"
    />
    <path d="M52 30 q5 -7 10 0 q5 -7 10 0 M92 18 q4 -6 8 0 q4 -6 8 0" />
  </g>
);

/* Top-down sketch of a one-bedroom bnb: balcony, open-plan living, kitchen,
   bedroom and bath. Walls are heavy, furniture light, door swings dashed. */
const PLAN = (
  <g>
    {/* north arrow */}
    <circle cx="66" cy="42" r="16" strokeWidth="1.2" />
    <path className="bp-acc" d="M66 56 V28 M66 28 L59 40 M66 28 L73 40" />
    <text className="bp-keep" x="62" y="19" fontSize="11" fontStyle="italic" fontFamily="serif" fill={PENCIL} stroke="none">N</text>

    {/* balcony */}
    <path strokeWidth="2.6" d="M236 80 V36 H370 V80" />
    <path strokeWidth="1" opacity=".5" d="M242 80 V42 H364 V80" />
    <circle cx="262" cy="62" r="7" />
    <circle cx="324" cy="62" r="7" />
    <circle cx="293" cy="62" r="9" />
    <circle className="bp-acc" cx="350" cy="58" r="8" />
    <path className="bp-acc" d="M350 58 l-6 -7 M350 58 l7 -6 M350 58 v-12 M350 58 l-9 4" />
    <text className="bp-keep" x="168" y="62" fontSize="11" fontStyle="italic" fontFamily="serif" fill={PENCIL} stroke="none">Balcony</text>

    {/* outer walls, then windows and door openings cut through them */}
    <path strokeWidth="5" d="M30 80 H370 V380 H30 Z" />
    <path strokeWidth="1" opacity=".5" d="M37 87 H363 V373 H37 Z" />
    <g fill="#fff" strokeWidth="1.4">
      <rect x="26" y="118" width="8" height="54" />
      <rect x="26" y="268" width="8" height="32" />
      <rect x="66" y="76" width="64" height="8" />
      <rect x="180" y="76" width="48" height="8" />
    </g>
    <g fill="#fff" stroke="none">
      <rect x="250" y="75" width="90" height="10" />
      <rect x="127" y="375" width="31" height="10" />
    </g>
    <rect x="250" y="77.5" width="45" height="5" strokeWidth="1.2" />
    <rect x="295" y="77.5" width="45" height="5" strokeWidth="1.2" />

    {/* inner walls */}
    <path strokeWidth="4" d="M170 80 V190 M170 220 V240 H30 M110 240 V335 M110 362 V380" />

    {/* door leaves and swings */}
    <path d="M170 190 H201 M110 335 H137 M127 380 V349" strokeWidth="2" />
    <path className="bp-acc bp-keep" d="M201 190 A31 31 0 0 1 170 221 M137 335 A27 27 0 0 1 110 362 M127 349 A31 31 0 0 1 158 380" />

    <g strokeWidth="1.6">
      {/* bedroom */}
      <rect x="62" y="86" width="76" height="94" rx="3" />
      <rect className="bp-acc" x="68" y="92" width="28" height="16" rx="5" />
      <rect className="bp-acc" x="104" y="92" width="28" height="16" rx="5" />
      <path d="M62 128 H138" />
      <path d="M70 142 l12 -8 M70 156 l24 -16 M70 170 l36 -24 M92 174 l34 -24 M116 176 l18 -12" opacity=".35" />
      <rect x="44" y="90" width="14" height="16" />
      <rect x="142" y="90" width="14" height="16" />
      <circle cx="51" cy="98" r="3" />
      <circle cx="149" cy="98" r="3" />
      <rect x="34" y="214" width="100" height="22" />
      <path d="M59 214 V236 M84 214 V236 M109 214 V236" />

      {/* bath */}
      <rect x="36" y="246" width="28" height="76" rx="7" />
      <rect x="40" y="250" width="20" height="68" rx="10" opacity=".6" />
      <rect x="84" y="246" width="16" height="7" />
      <ellipse cx="92" cy="266" rx="8" ry="11" />
      <rect x="84" y="300" width="22" height="20" rx="4" />
      <circle cx="95" cy="310" r="6" />

      {/* living */}
      <rect x="172" y="116" width="9" height="76" />
      <path d="M176 124 V184" opacity=".6" />
      <rect className="bp-acc bp-keep" x="190" y="100" width="76" height="104" />
      <rect x="204" y="136" width="22" height="34" rx="3" />
      <rect x="240" y="108" width="32" height="88" rx="5" />
      <rect x="264" y="108" width="8" height="88" rx="3" />
      <path d="M240 137 H264 M240 166 H264" />
      <circle className="bp-acc" cx="350" cy="106" r="10" />
      <path className="bp-acc" d="M350 106 l-8 -8 M350 106 l9 -7 M350 106 v-14 M350 106 l-12 5 M350 106 l12 6" />

      {/* kitchen and dining */}
      <rect x="338" y="210" width="30" height="160" />
      <rect x="342" y="226" width="22" height="32" rx="4" />
      <path d="M353 226 v-6 h6" />
      <rect x="342" y="282" width="22" height="30" />
      <circle className="bp-acc" cx="348" cy="290" r="4" />
      <circle className="bp-acc" cx="358" cy="290" r="4" />
      <circle className="bp-acc" cx="348" cy="304" r="4" />
      <circle className="bp-acc" cx="358" cy="304" r="4" />
      <rect x="338" y="346" width="30" height="24" />
      <path d="M338 354 H368" />
      <rect x="250" y="282" width="66" height="44" rx="3" />
      <circle className="bp-acc" cx="283" cy="304" r="5" />
      <rect x="256" y="270" width="16" height="10" rx="2" />
      <rect x="294" y="270" width="16" height="10" rx="2" />
      <rect x="256" y="328" width="16" height="10" rx="2" />
      <rect x="294" y="328" width="16" height="10" rx="2" />
      <rect x="240" y="296" width="8" height="16" rx="2" />
      <rect x="318" y="296" width="8" height="16" rx="2" />
    </g>

    {/* room names */}
    <g className="bp-keep" fontSize="11" fontStyle="italic" fontFamily="serif" fill={PENCIL} stroke="none">
      <text x="64" y="204">Bedroom</text>
      <text x="44" y="352">Bath</text>
      <text x="188" y="228">Living</text>
      <text x="236" y="258">Kitchen &amp; dining</text>
      <text x="120" y="400">Entry</text>
    </g>

    {/* dimension line */}
    <path strokeWidth="1.2" opacity=".6" d="M30 410 H370 M30 403 V417 M370 403 V417" />
    <text className="bp-keep" x="200" y="433" textAnchor="middle" fontSize="11" fontStyle="italic" fontFamily="serif" fill={PENCIL} stroke="none">
      sketch, not to scale
    </text>
  </g>
);

const STYLES = `
  .bp-sk :is(path,line,rect,circle,ellipse):not(.bp-keep){stroke-dasharray:var(--dash,400);stroke-dashoffset:var(--dash,400)}
  .bp-sk .bp-acc{stroke:var(--acc)}
  .bp-sk .bp-keep{stroke-dasharray:3 6;stroke-dashoffset:0;opacity:0}
  .bp-in .bp-sk :is(path,line,rect,circle,ellipse):not(.bp-keep){
    animation:bp-draw 1.5s cubic-bezier(.5,0,.2,1) forwards;
    animation-delay:calc(var(--i) * .4s);
  }
  .bp-in .bp-sk .bp-keep{animation:bp-fade .8s ease forwards;animation-delay:calc(var(--i) * .4s + 1s)}
  .bp-rule{stroke-dasharray:1;stroke-dashoffset:1}
  .bp-in .bp-rule{animation:bp-draw 1.2s ease-out forwards;animation-delay:calc(var(--i) * .4s + .3s)}
  @keyframes bp-draw{to{stroke-dashoffset:0}}
  @keyframes bp-fade{to{opacity:1}}
  @media (prefers-reduced-motion:reduce){
    .bp-sk :is(path,line,rect,circle,ellipse):not(.bp-keep){stroke-dasharray:none;stroke-dashoffset:0;animation:none!important}
    .bp-sk .bp-keep{opacity:1;animation:none!important}
    .bp-rule{stroke-dashoffset:0;animation:none!important}
  }
`;

/* A wobbly pencil rule that draws itself across */
function Rule({ i, heavy = false, className = "" }: { i: number; heavy?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 400 8"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 h-2 w-full ${className}`}
      style={{ filter: "url(#bp-pencil)", ["--i" as string]: i } as CSSProperties}
    >
      <path
        className="bp-rule"
        pathLength={1}
        d="M0 4 C 60 1 90 7 150 4 S 260 1 320 5 S 380 3 400 4"
        fill="none"
        stroke={heavy ? INK : RASPBERRY}
        strokeOpacity={heavy ? 1 : 0.5}
        strokeWidth={heavy ? 3 : 1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

/* The round pencil vignette that holds each drawing */
function Vignette({
  art,
  i,
  inverted = false,
  className = "h-20 w-20 md:h-24 md:w-24",
}: {
  art: ReactNode;
  i: number;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`bp-sk relative grid shrink-0 place-items-center rounded-full ${className}`}
      style={
        {
          "--i": i,
          "--acc": inverted ? LAVENDER : RASPBERRY,
          color: inverted ? "#fff" : INK,
          backgroundColor: inverted ? "transparent" : "#fff",
        } as CSSProperties
      }
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border"
        style={{ borderColor: inverted ? "#ffffff66" : `${INK}59` }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 translate-x-[3px] translate-y-[2px] rounded-full border"
        style={{ borderColor: inverted ? "#ffffff33" : `${RASPBERRY}66` }}
      />
      <svg
        viewBox="0 0 120 120"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative h-[78%] w-[78%]"
        style={{
          filter: `url(#bp-pencil) drop-shadow(1.2px 1.2px 0 ${inverted ? "#ffffff40" : `${INK}38`})`,
        }}
      >
        {art}
      </svg>
    </div>
  );
}

export default function WhyBookUs() {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  // One orchestrated moment: everything sketches itself in once, on first view.
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
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="why_choose_us"
      aria-labelledby="why-book-us-heading"
      className={`relative w-full scroll-mt-[var(--site-header-height,196px)] border-t border-[#2B0715]/10 bg-white px-[6%] py-20 md:py-28 ${
        seen ? "bp-in" : ""
      }`}
      style={{
        backgroundImage: `linear-gradient(${RASPBERRY}0F 1px, transparent 1px), linear-gradient(90deg, ${RASPBERRY}0F 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    >
      <style>{STYLES}</style>

      {/* Shared pencil wobble: makes straight strokes slightly hand-drawn */}
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <filter id="bp-pencil" x="-5%" y="-30%" width="110%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.8" />
          </filter>
        </defs>
      </svg>

      <div className="grid gap-x-16 gap-y-14 lg:grid-cols-12">
        {/* Left column: headline, intro and a margin sketch, all sticky */}
        <div className="lg:sticky lg:top-[calc(var(--site-header-height,196px)+2rem)] lg:col-span-5 lg:self-start">
          <h2
            id="why-book-us-heading"
            className="font-serif text-5xl font-medium leading-[1.02] tracking-tight text-[#2B0715] md:text-6xl xl:text-7xl"
          >
            Why book
            <br />
            with us
          </h2>

          <p className="mt-6 max-w-sm font-serif text-lg leading-8 text-[#5A3A47]">
            We make it easier to discover comfortable places to stay,
            understand what you are booking, and connect with the right
            property.
          </p>

          <div
            className="bp-sk mt-10 hidden w-full max-w-xs md:block"
            style={{ "--i": 0, "--acc": RASPBERRY, color: INK } as CSSProperties}
          >
            <svg
              viewBox="0 0 280 150"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-full"
              style={{ filter: `url(#bp-pencil) drop-shadow(1.2px 1.2px 0 ${INK}30)` }}
            >
              {ACACIA}
            </svg>
          </div>
        </div>

        {/* Right column: a sketched contents list */}
        <div className="lg:col-span-7">
          <ul role="list" className="relative pt-1">
            <Rule i={0} heavy className="top-0" />

            {BENEFITS.map((benefit, i) => (
              <li
                key={benefit.title}
                className="relative grid grid-cols-[auto_1fr] items-start gap-x-6 py-8 md:gap-x-8 md:py-10"
              >
                <Vignette art={benefit.art} i={i + 1} />

                <div className="pt-1">
                  <h3 className="font-serif text-2xl font-medium tracking-tight text-[#2B0715] md:text-3xl">
                    {benefit.title}
                  </h3>
                  <p className="mt-3 max-w-[52ch] text-[15px] leading-7 text-[#5A3A47] md:text-base md:leading-8">
                    {benefit.description}
                  </p>
                </div>

                <Rule i={i + 1} className="bottom-0" />
              </li>
            ))}
          </ul>

          {/* The one loud moment: a floor plan pinned to the sheet with tape */}
          <div className="mt-12 md:mt-14">
            {/* Draughtsman's dimension line */}
            <div
              className="mb-4 flex items-center gap-3 font-serif text-sm italic"
              style={{ color: PENCIL }}
              aria-hidden="true"
            >
              <span className="h-3 border-l" style={{ borderColor: PENCIL }} />
              <span className="flex-1 border-t border-dashed" style={{ borderColor: `${PENCIL}88` }} />
              <span>listings in every county</span>
              <span className="flex-1 border-t border-dashed" style={{ borderColor: `${PENCIL}88` }} />
              <span className="h-3 border-l" style={{ borderColor: PENCIL }} />
            </div>

            <div className="relative">
              {/* Masking tape */}
              <span
                aria-hidden="true"
                className="absolute -top-3 left-8 z-10 h-6 w-20 -rotate-[5deg] border"
                style={{ backgroundColor: `${LAVENDER}E6`, borderColor: `${INK}1F` }}
              />
              <span
                aria-hidden="true"
                className="absolute -top-3 right-8 z-10 h-6 w-20 rotate-[4deg] border"
                style={{ backgroundColor: `${LAVENDER}E6`, borderColor: `${INK}1F` }}
              />

              <div className="grid overflow-hidden rounded-sm bg-[#D61A6B] text-white shadow-[6px_6px_0_0_rgba(43,7,21,0.16)] md:grid-cols-2">
                <div
                  className="bp-sk relative aspect-[10/11] bg-white md:order-last md:aspect-auto md:min-h-[28rem]"
                  style={
                    {
                      "--i": 3,
                      "--dash": 1500,
                      "--acc": RASPBERRY,
                      color: INK,
                      backgroundImage: `linear-gradient(${RASPBERRY}14 1px, transparent 1px), linear-gradient(90deg, ${RASPBERRY}14 1px, transparent 1px)`,
                      backgroundSize: "24px 24px",
                    } as CSSProperties
                  }
                >
                  <svg
                    role="img"
                    aria-label="Top-down sketch of a one-bedroom apartment: balcony, open-plan living and kitchen, bedroom and bath"
                    viewBox="0 0 400 440"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                    className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)]"
                    style={{ filter: `url(#bp-pencil) drop-shadow(1px 1px 0 ${INK}30)` }}
                  >
                    {PLAN}
                  </svg>
                  {/* Sheet border */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-2 border border-[#2B0715]/25"
                  />
                </div>

                <div className="flex flex-col justify-between p-8 md:p-10 xl:p-12">
                  <Vignette art={PIN} i={4} inverted className="h-20 w-20 md:h-24 md:w-24" />
                  <div className="mt-10">
                    <h3 className="font-serif text-3xl font-medium leading-tight tracking-tight xl:text-5xl">
                      Made for Kenya
                    </h3>
                    <p className="mt-5 max-w-[40ch] font-serif text-lg leading-8 text-white/95">
                      Local payment options, listings in every county, and a
                      team that understands how people actually travel here.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}