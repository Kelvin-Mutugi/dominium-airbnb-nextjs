"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const INK = "#2B0715";
const PENCIL = "#5A3A47";
const RASPBERRY = "#D61A6B";
const PAPER = "#ffffff";

/* Each drawing is a 120x120 line sketch. `bp-acc` strokes take the accent
   colour, `bp-keep` strokes are dashed "motion" lines that fade in. */
const SKETCHES = [
  // 1. Find a property: a house under a magnifying glass
  <g key="1">
    <path d="M18 62 L48 34 L78 62" />
    <path d="M26 58 V94 H70 V62" />
    <path d="M40 94 V76 H54 V94" />
    <path d="M62 44 V34 H69 V50" />
    <path d="M30 72 l10 -10 M30 82 l18 -18 M30 92 l12 -12" opacity=".4" />
    <circle className="bp-acc" cx="82" cy="76" r="17" />
    <path className="bp-acc" d="M73 70 l8 -7 M72 78 l14 -13" opacity=".5" />
    <path d="M94 89 L108 104" strokeWidth="4" />
  </g>,
  // 2. Select your stay: calendar with two circled dates
  <g key="2">
    <rect x="22" y="30" width="76" height="64" rx="5" />
    <path d="M22 48 H98 M22 64 H98 M22 80 H98 M47 48 V94 M72 48 V94" opacity=".55" />
    <path d="M40 22 V38 M80 22 V38" strokeWidth="4" />
    <ellipse className="bp-acc" cx="34" cy="72" rx="11" ry="9" />
    <ellipse className="bp-acc" cx="85" cy="72" rx="11" ry="9" />
    <path className="bp-acc bp-keep" d="M46 72 H73" />
    <path d="M28 38 H92" opacity=".0" />
  </g>,
  // 3. Review your booking: clipboard with ticked lines and a total
  <g key="3">
    <rect x="28" y="26" width="64" height="76" rx="5" />
    <path d="M46 26 V17 H74 V26 Z" strokeWidth="3" />
    <path d="M37 46 l3 3 l6 -7 M52 46 H82 M37 60 l3 3 l6 -7 M52 60 H76 M37 74 l3 3 l6 -7 M52 74 H82" />
    <path className="bp-acc" d="M40 90 H80 M40 95 H80" />
    <path className="bp-acc" d="M54 87 q4 -8 8 0 t8 0" opacity=".0" />
  </g>,
  // 4. Submit your booking: paper plane with a looping trail
  <g key="4">
    <path d="M24 60 L102 26 L76 98 L58 76 Z" />
    <path d="M58 76 L102 26 M58 76 L56 96 L68 84" />
    <path d="M32 64 l16 4 M40 52 l8 6 M34 76 l10 -4" opacity=".4" />
    <path className="bp-acc bp-keep" d="M10 102 C 20 72, 42 100, 52 82" />
  </g>,
  // 5. Complete payment: card with a chip and a coin
  <g key="5">
    <rect x="14" y="40" width="88" height="56" rx="7" />
    <path d="M14 56 H102 M14 62 H102" />
    <rect className="bp-acc" x="24" y="72" width="18" height="13" rx="2" />
    <path d="M52 78 H66 M72 78 H90 M52 87 H78" opacity=".55" />
    <circle className="bp-acc" cx="94" cy="34" r="13" />
    <path className="bp-acc" d="M94 27 V41 M89 31 q5 -4 10 0 M89 38 q5 4 10 0" />
    <path className="bp-keep" d="M4 50 H12 M2 64 H12 M6 78 H12" />
  </g>,
  // 6. Booking confirmed: the finished house with a check mark
  <g key="6">
    <path d="M14 62 L60 24 L106 62" />
    <path d="M24 56 V98 H96 V56" />
    <path d="M50 98 V80 a10 10 0 0 1 20 0 V98" />
    <path className="bp-acc" d="M40 52 L56 68 L84 34" strokeWidth="4" />
    <path d="M100 18 V30 M94 24 H106 M18 26 V34 M14 30 H22" />
    <path d="M28 70 l10 -10 M28 82 l16 -16 M78 70 l10 -10 M78 84 l14 -14" opacity=".4" />
  </g>,
];

const STEPS = [
  {
    title: "Find a property",
    desc: "Search and filter available properties by location, price, dates, guests, and other preferences.",
  },
  {
    title: "Select your stay",
    desc: "Choose your check-in and check-out dates and specify the number of guests for your booking.",
  },
  {
    title: "Review your booking",
    desc: "Check the property details, stay dates, guest information, booking charges, and total price.",
  },
  {
    title: "Submit your booking",
    desc: "Provide the required booking information and submit your reservation request through the platform.",
  },
  {
    title: "Complete payment",
    desc: "Complete the required payment securely using the payment method provided by the platform.",
  },
  {
    title: "Booking confirmed",
    desc: "Once the booking is successfully processed, you'll receive your confirmation and reservation details.",
  },
];

// Route that threads through the six drawings on desktop (viewBox 1200 x 220)
const ROUTE =
  "M100 70 C200 70 200 150 300 150 S400 70 500 70 S600 150 700 150 S800 70 900 70 S1000 150 1100 150";

const STYLES = `
  .bp-sk :is(path,line,rect,circle,ellipse):not(.bp-keep){stroke-dasharray:400;stroke-dashoffset:400}
  .bp-sk .bp-acc{stroke:var(--acc)}
  .bp-sk .bp-keep{stroke-dasharray:3 6;stroke-dashoffset:0;opacity:0}
  .bp-in .bp-sk :is(path,line,rect,circle,ellipse):not(.bp-keep){
    animation:bp-draw 1.5s cubic-bezier(.5,0,.2,1) forwards;
    animation-delay:calc(var(--i) * .45s);
  }
  .bp-in .bp-sk .bp-keep{animation:bp-fade .8s ease forwards;animation-delay:calc(var(--i) * .45s + 1s)}
  .bp-route{stroke-dasharray:6 9;stroke-dashoffset:1400;opacity:0}
  .bp-in .bp-route{animation:bp-route 3.2s ease-out .2s forwards}
  @keyframes bp-draw{to{stroke-dashoffset:0}}
  @keyframes bp-fade{to{opacity:1}}
  @keyframes bp-route{to{stroke-dashoffset:0;opacity:1}}
  @media (prefers-reduced-motion:reduce){
    .bp-sk :is(path,line,rect,circle,ellipse):not(.bp-keep){stroke-dasharray:none;stroke-dashoffset:0;animation:none!important}
    .bp-sk .bp-keep,.bp-route{opacity:1;animation:none!important;stroke-dashoffset:0}
    .bp-dot{display:none}
  }
`;

export default function BookingProcess() {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  // One orchestrated moment: the drawings sketch themselves in once, on first view.
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
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="booking_process"
      aria-labelledby="booking-process-heading"
      className={`relative w-full overflow-hidden px-[6%] py-20 md:py-28 ${seen ? "bp-in" : ""}`}
      style={{
        backgroundColor: PAPER,
        backgroundImage: `linear-gradient(${RASPBERRY}14 1px, transparent 1px), linear-gradient(90deg, ${RASPBERRY}14 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    >
      <style>{STYLES}</style>

      {/* Shared pencil wobble: makes every straight stroke slightly hand-drawn */}
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <filter id="bp-pencil" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.8" />
          </filter>
        </defs>
      </svg>

      {/* Heading, with a drawing-sheet title block */}
      <div className="mb-14 flex flex-wrap items-end justify-between gap-6 md:mb-20">
        <div>
          <h2
            id="booking-process-heading"
            className="font-serif text-5xl font-medium leading-[1.02] tracking-tight md:text-6xl"
            style={{ color: INK }}
          >
            Booking process
          </h2>
          <p className="mt-5 max-w-md font-serif text-lg leading-8" style={{ color: PENCIL }}>
            Book your stay in six simple steps.
          </p>
        </div>

        <div
          className="hidden border px-4 py-3 font-serif text-sm italic leading-6 md:block"
          style={{ borderColor: `${INK}66`, color: PENCIL }}
        >
          <p className="font-medium not-italic" style={{ color: INK }}>
            Plan of a booking
          </p>
          <p>From first search to the key in your hand</p>
        </div>
      </div>

      <div className="relative">
        {/* Desktop route, sketched between the drawings */}
        <svg
          viewBox="0 0 1200 220"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 hidden h-[220px] w-full lg:block"
          style={{ filter: "url(#bp-pencil)" }}
        >
          <path
            className="bp-route"
            d={ROUTE}
            fill="none"
            stroke={RASPBERRY}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle className="bp-dot" r="5" fill={RASPBERRY}>
            <animateMotion dur="10s" repeatCount="indefinite" path={ROUTE} />
          </circle>
        </svg>

        {/* Mobile route */}
        <div
          aria-hidden="true"
          className="absolute bottom-10 left-12 top-10 border-l-2 border-dashed lg:hidden"
          style={{ borderColor: `${RASPBERRY}66` }}
        />

        <ol className="relative grid gap-10 lg:grid-cols-6 lg:gap-0">
          {STEPS.map((step, i) => {
            const last = i === STEPS.length - 1;
            const low = i % 2 === 1;

            return (
              <li
                key={step.title}
                className={`flex items-start gap-5 lg:flex-col lg:items-center lg:gap-0 lg:px-3 lg:text-center ${
                  low ? "lg:mt-[90px]" : "lg:mt-[10px]"
                }`}
              >
                <div
                  className="bp-sk relative grid h-24 w-24 shrink-0 place-items-center rounded-full lg:h-32 lg:w-32"
                  style={
                    {
                      "--i": i,
                      "--acc": last ? PAPER : RASPBERRY,
                      backgroundColor: last ? RASPBERRY : PAPER,
                      color: last ? "#fff" : INK,
                    } as CSSProperties
                  }
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full border"
                    style={{ borderColor: last ? "#ffffff66" : `${INK}59` }}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 translate-x-[3px] translate-y-[2px] rounded-full border"
                    style={{ borderColor: last ? "#ffffff33" : `${RASPBERRY}66` }}
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
                      filter: `url(#bp-pencil) drop-shadow(1.2px 1.2px 0 ${
                        last ? "#ffffff40" : `${INK}38`
                      })`,
                    }}
                  >
                    {SKETCHES[i]}
                  </svg>

                  <span
                    className="absolute -left-1 -top-1 grid h-7 w-7 place-items-center rounded-full font-serif text-sm font-medium"
                    style={{ backgroundColor: INK, color: PAPER }}
                  >
                    {i + 1}
                  </span>
                </div>

                <div className="pt-2 lg:pt-6">
                  <h3
                    className="font-serif text-xl font-medium tracking-tight md:text-2xl"
                    style={{ color: INK }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="mt-2 max-w-[34ch] text-sm leading-6 lg:mx-auto lg:max-w-[24ch]"
                    style={{ color: PENCIL }}
                  >
                    {step.desc}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}