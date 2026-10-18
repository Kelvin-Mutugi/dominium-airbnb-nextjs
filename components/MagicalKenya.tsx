"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const INK = "#2B0715";
const PENCIL = "#5A3A47";
const RASPBERRY = "#D61A6B";

/* Seven pencil sketches, 120x120 each. `mk-acc` strokes take the raspberry accent. */
const destinations: { name: string; subtitle: string; art: ReactNode }[] = [
  {
    name: "Maasai Mara",
    subtitle: "Wild & untamed",
    // Flat-topped acacia, low sun, birds
    art: (
      <g>
        <path d="M18 54 C32 38 62 34 76 42 C92 32 110 40 116 56 C102 50 90 52 82 56 C66 50 38 52 18 54 Z" />
        <path d="M62 102 C64 84 62 66 58 52 M70 102 C68 84 70 68 72 50" />
        <path d="M26 56 l-3 10 M44 54 l-2 12 M92 56 l-2 11 M106 56 l-4 9" opacity=".4" />
        <path d="M6 102 H114 M20 102 l-2 -7 M25 102 l1 -8 M92 102 l-2 -7 M98 102 l3 -9 M104 102 l-1 -6" />
        <circle className="mk-acc" cx="94" cy="20" r="8" />
        <path className="mk-acc" d="M94 6 v3 M94 31 v3 M80 20 h3 M105 20 h3" />
        <path d="M22 24 q4 -5 8 0 q4 -5 8 0 M42 14 q3 -4 6 0 q3 -4 6 0" />
      </g>
    ),
  },
  {
    name: "Amboseli",
    subtitle: "Beneath Kilimanjaro",
    // Kilimanjaro with its snow cap and an elephant
    art: (
      <g>
        <path d="M6 84 L38 40 H52 L62 34 H78 L114 84" />
        <path className="mk-acc" d="M38 40 L44 50 L50 42 L56 52 L62 40 L68 50 L74 38 L80 48" />
        <path d="M20 66 l10 -16 M92 70 l-8 -18 M56 70 l2 -20" opacity=".35" />
        <path d="M24 94 C22 78 38 72 54 74 C68 74 74 82 72 94" />
        <path d="M30 94 V106 M42 94 V106 M60 94 V106 M68 94 V106" />
        <path d="M72 78 C82 76 88 84 86 94 C85 102 90 104 93 101" />
        <path d="M70 80 C63 84 63 92 69 94" />
        <circle cx="80" cy="82" r="1.4" />
        <path d="M24 82 C18 86 18 94 21 98" />
        <path d="M6 106 H114" />
      </g>
    ),
  },
  {
    name: "Diani Beach",
    subtitle: "Indian Ocean paradise",
    // Leaning palm, sun, waves
    art: (
      <g>
        <path d="M42 98 C44 80 52 62 62 44" />
        <path d="M62 44 C48 34 36 38 26 52 M62 44 C52 28 38 26 28 28 M62 44 C70 30 84 28 96 36 M62 44 C76 44 90 50 96 64 M62 44 C60 32 64 24 74 18" />
        <circle cx="58" cy="50" r="3" />
        <circle cx="66" cy="51" r="3" />
        <circle className="mk-acc" cx="98" cy="20" r="9" />
        <path d="M8 96 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0" />
        <path d="M14 106 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0" opacity=".7" />
        <path className="mk-acc mk-keep" d="M70 98 h8 M84 98 h10" />
      </g>
    ),
  },
  {
    name: "Lamu",
    subtitle: "Coastal soul",
    // A dhow under lateen sails
    art: (
      <g>
        <path d="M14 88 H106 L94 102 H28 Z" />
        <path d="M60 88 V18" />
        <path className="mk-acc" d="M60 22 L100 82 H60 Z" />
        <path d="M56 38 L28 82 H56" />
        <path d="M66 40 l12 22 M66 52 l18 26" className="mk-acc" opacity=".45" />
        <path d="M60 18 l8 3 l-8 3" />
        <path d="M8 110 q8 -5 16 0 t16 0 t16 0 t16 0 t16 0 t16 0" />
        <path d="M34 94 H88" opacity=".5" />
      </g>
    ),
  },
  {
    name: "Mount Kenya",
    subtitle: "Into the highlands",
    // Jagged twin peaks with snow
    art: (
      <g>
        <path d="M6 98 L32 54 L46 64 L60 20 L74 46 L84 40 L114 98" />
        <path className="mk-acc" d="M60 20 L50 42 L57 37 L62 48 L68 37 L74 46" />
        <path d="M60 20 V70 M44 74 l8 -22 M80 76 l-6 -26 M26 86 l10 -20" opacity=".35" />
        <path d="M10 44 q2 -7 10 -5 q5 -6 12 0 q8 -1 8 5 Z" />
        <path d="M14 98 v-10 M10 98 l4 -12 l4 12 M100 98 v-10 M96 98 l4 -12 l4 12 M108 98 l-4 -9" />
        <path d="M6 98 H114" />
      </g>
    ),
  },
  {
    name: "Lake Naivasha",
    subtitle: "Peace in the Rift Valley",
    // A hippo in the shallows with papyrus reeds
    art: (
      <g>
        <path d="M24 82 C24 66 48 60 62 66 C72 68 78 76 76 82 Z" />
        <path d="M36 65 l-2 -7 l7 3 M54 62 l2 -7 l5 5" />
        <circle cx="48" cy="72" r="1.6" />
        <path d="M68 74 h.1 M73 76 h.1" strokeWidth="3" />
        <path d="M8 86 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0" />
        <path d="M14 96 q6 -4 12 0 t12 0 t12 0 t12 0" opacity=".6" />
        <path d="M92 104 V52 M100 104 V44 M108 104 V60" />
        <path d="M92 52 l-6 -8 M92 52 v-10 M92 52 l6 -8 M100 44 l-6 -8 M100 44 v-10 M100 44 l6 -8 M108 60 l-5 -7 M108 60 l5 -7" />
        <circle className="mk-acc" cx="30" cy="30" r="8" />
        <path className="mk-acc mk-keep" d="M12 106 h14 M34 106 h12" />
      </g>
    ),
  },
  {
    name: "Nairobi",
    subtitle: "The capital city",
    // Skyline with the cylindrical KICC tower
    art: (
      <g>
        <rect x="52" y="42" width="14" height="60" />
        <path className="mk-acc" d="M52 42 L59 22 L66 42 M48 42 H70" />
        <path d="M59 22 V12" />
        <rect x="18" y="62" width="24" height="40" />
        <rect x="74" y="54" width="20" height="48" />
        <rect x="96" y="72" width="14" height="30" />
        <path d="M24 70 h4 M32 70 h4 M24 78 h4 M32 78 h4 M24 86 h4 M32 86 h4 M79 62 h3 M86 62 h3 M79 70 h3 M86 70 h3 M79 78 h3 M86 78 h3 M79 86 h3 M86 86 h3" />
        <path d="M56 54 V96 M62 54 V96" opacity=".35" />
        <circle className="mk-acc" cx="94" cy="26" r="7" />
        <path d="M6 102 H114" />
      </g>
    ),
  },
];

const STYLES = `
  .mk-sk :is(path,line,rect,circle,ellipse):not(.mk-keep){stroke-dasharray:400;stroke-dashoffset:400}
  .mk-sk .mk-acc{stroke:var(--acc)}
  .mk-sk .mk-keep{stroke-dasharray:3 6;stroke-dashoffset:0;opacity:0}
  .mk-in .mk-sk :is(path,line,rect,circle,ellipse):not(.mk-keep){
    animation:mk-draw 1.5s cubic-bezier(.5,0,.2,1) forwards;
    animation-delay:calc(var(--i) * .3s);
  }
  .mk-in .mk-sk .mk-keep{animation:mk-fade .8s ease forwards;animation-delay:calc(var(--i) * .3s + 1s)}
  .mk-track{animation:mk-slide 130s linear infinite;will-change:transform}
  @keyframes mk-draw{to{stroke-dashoffset:0}}
  @keyframes mk-fade{to{opacity:1}}
  @keyframes mk-slide{from{transform:translateX(0)}to{transform:translateX(calc(-50% - 12px))}}
  @media (prefers-reduced-motion:reduce){
    .mk-track{animation:none}
    .mk-sk :is(path,line,rect,circle,ellipse):not(.mk-keep){stroke-dasharray:none;stroke-dashoffset:0;animation:none!important}
    .mk-sk .mk-keep{opacity:1;animation:none!important}
  }
`;

function DestinationCard({
  name,
  subtitle,
  art,
  i,
}: {
  name: string;
  subtitle: string;
  art: ReactNode;
  i: number;
}) {
  return (
    <article className="group flex w-[100px] shrink-0 flex-col items-center text-center sm:w-[120px]">
      <div
        className="mk-sk relative grid h-[72px] w-[72px] place-items-center rounded-full bg-white transition-transform duration-300 group-hover:-translate-y-1 sm:h-[88px] sm:w-[88px]"
        style={{ "--i": i, "--acc": RASPBERRY, color: INK } as CSSProperties}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: `${INK}59` }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 translate-x-[3px] translate-y-[2px] rounded-full border transition-transform duration-300 group-hover:translate-x-[5px] group-hover:translate-y-[4px]"
          style={{ borderColor: `${RASPBERRY}77` }}
        />
        <svg
          viewBox="0 0 120 120"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative h-[80%] w-[80%]"
          style={{ filter: `url(#mk-pencil) drop-shadow(1px 1px 0 ${INK}38)` }}
        >
          {art}
        </svg>
      </div>

      {/* <h3
        className="mt-3 font-serif text-xm font-medium leading-tight tracking-tight sm:text-base"
        style={{ color: INK }}
      >
        {name}
      </h3> */}
      <p className="mt-0.5 whitespace-nowrap font-serif text-[11px] italic leading-4 sm:text-xs" style={{ color: PENCIL }}>
        {subtitle}
      </p>
    </article>
  );
}

// Each group must be wider than the screen, otherwise a gap shows up
// when the track loops. Raise this if you add ultra-wide support.
const COPIES = 4;

function CardGroup({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="flex gap-6" aria-hidden={hidden || undefined}>
      {Array.from({ length: COPIES }).flatMap((_, copy) =>
        destinations.map((destination, i) => (
          <DestinationCard key={`${copy}-${destination.name}`} {...destination} i={i} />
        ))
      )}
    </div>
  );
}

export default function MagicalKenya() {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  // The sketches draw themselves once, the first time the strip scrolls into view.
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
      aria-label="Destinations across Kenya"
      className={`relative overflow-hidden border-b border-[#2B0715]/10 bg-white ${seen ? "mk-in" : ""}`}
      style={{
        backgroundImage: `linear-gradient(${RASPBERRY}0F 1px, transparent 1px), linear-gradient(90deg, ${RASPBERRY}0F 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    >
      <style>{STYLES}</style>

      {/* Shared pencil wobble */}
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <filter id="mk-pencil" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2" />
          </filter>
        </defs>
      </svg>

      <div className="relative overflow-hidden py-4 sm:py-5">
        {/* Soft edge fade, matched to the background */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:w-20" />

        <div className="mk-track relative flex w-max gap-6">
          {/* The journey line the sketches are strung along */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-9 border-t border-dashed sm:top-11"
            style={{ borderColor: `${RASPBERRY}55` }}
          />
          <CardGroup />
          {/* Identical second group, so the loop is seamless */}
          <CardGroup hidden />
        </div>
      </div>
    </section>
  );
}