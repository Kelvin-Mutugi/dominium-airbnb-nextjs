"use client";

const destinations = [
  {
    name: "Maasai Mara",
    subtitle: "Wild & untamed",
    image:
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=600&q=85",
  },
  {
    name: "Amboseli",
    subtitle: "Beneath Kilimanjaro",
    image:
      "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=600&q=85",
  },
  {
    name: "Diani Beach",
    subtitle: "Indian Ocean paradise",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=85",
  },
  {
    name: "Lamu",
    subtitle: "Coastal soul",
    image:
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=600&q=85",
  },
  {
    name: "Mount Kenya",
    subtitle: "Into the highlands",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=85",
  },
  {
    name: "Lake Naivasha",
    subtitle: "Peace in the Rift Valley",
    image:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=600&q=85",
  },
  {
    name: "Nairobi",
    subtitle: "The capital city",
    image:
      "https://unsplash.com/photos/vyagy6HJpVE/download?force=true&w=1920",
  },
];

function DestinationCard({
  name,
  subtitle,
  image,
}: {
  name: string;
  subtitle: string;
  image: string;
}) {
  return (
    <article
      className="
        group relative h-[80px] w-[80px] shrink-0
        overflow-hidden rounded-lg
        bg-[#F5F5F5]
        p-[3px]
        shadow-[0_4px_10px_rgba(0,0,0,0.4)]
        transition-all duration-300
        hover:shadow-[0_6px_14px_rgba(0,0,0,0.5)]
        sm:h-[110px] sm:w-[110px]
      "
    >
      <div className="relative h-full w-full overflow-hidden rounded-[6px]">
        <img
            src={image}
            alt={name}
            loading="lazy"
            draggable={false}
            className="
              absolute inset-0 h-full w-full object-cover
              grayscale
              transition duration-700
              group-hover:scale-105 group-hover:grayscale-0
            "
        />

        {/* Dark cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-1.5 sm:p-2">
          <h3 className="text-[10px] font-semibold leading-tight text-white sm:text-[12px]">
            {name}
          </h3>

          <p className="mt-0.5 hidden truncate text-[9px] text-white/80 sm:block">
            {subtitle}
          </p>
        </div>
      </div>
    </article>
  );
}

// Each group must be wider than the screen, otherwise a gap shows up
// when the track loops. Raise this if you add ultra-wide support.
const COPIES = 4;

function CardGroup({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="flex gap-3" aria-hidden={hidden || undefined}>
      {Array.from({ length: COPIES }).flatMap((_, copy) =>
        destinations.map((destination) => (
          <DestinationCard
            key={`${copy}-${destination.name}`}
            {...destination}
          />
        ))
      )}
    </div>
  );
}

export default function MagicalKenya() {
  return (
    <section className="overflow-hidden bg-white">
      {/* Beadwork band (top) */}
      {/* <div className="beads" aria-hidden="true" /> */}

      {/* Infinite marquee */}
      <div className="relative overflow-hidden py-4">
        {/* Soft edge fade, matched to the background */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent" />

        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent" />

        <div className="marquee-track flex w-max gap-3">
          <CardGroup />
          {/* Identical second group, so the loop is seamless */}
          <CardGroup hidden />
        </div>
      </div>

      {/* Beadwork band (bottom) */}
      <div className="beads" aria-hidden="true" />

      <style jsx>{`
        /* One thin beaded stripe top and bottom */
        .beads {
          height: 1px;
          opacity: 0.2;
          background: grey
        }

        .marquee-track {
          animation: magicalKenya 200s linear infinite;
          will-change: transform;
        }

        /* .marquee-track:hover {
          animation-play-state: paused;
        } */

        @keyframes magicalKenya {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(calc(-50% - 6px));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}