"use client";

const destinations = [
  {
    name: "Maasai Mara",
    subtitle: "Wild & untamed",
    image:
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Amboseli",
    subtitle: "Beneath Kilimanjaro",
    image:
      "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Diani Beach",
    subtitle: "Indian Ocean paradise",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Lamu",
    subtitle: "Coastal soul",
    image:
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Mount Kenya",
    subtitle: "Into the highlands",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Lake Naivasha",
    subtitle: "Peace in the Rift Valley",
    image:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85",
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
        group relative h-[110px] w-[110px] shrink-0
        overflow-hidden rounded-xl
        bg-[#F5F5F5]
        p-[4px]
        shadow-[4px_4px_10px_rgba(0,0,0,0.12),-4px_-4px_10px_rgba(255,255,255,0.95)]
        transition-all duration-300
        hover:shadow-[6px_6px_14px_rgba(0,0,0,0.15),-6px_-6px_14px_rgba(255,255,255,1)]
        sm:h-[160px] sm:w-[160px]
      "
    >
      <div className="relative h-full w-full overflow-hidden rounded-[9px]">
        <img
          src={image}
          alt={name}
          loading="lazy"
          draggable={false}
          className="
            absolute inset-0 h-full w-full object-cover
            transition-transform duration-700
            group-hover:scale-105
          "
        />

        {/* Dark cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <h3 className="text-[12px] font-semibold leading-tight text-white sm:text-[14px]">
            {name}
          </h3>

          <p className="mt-0.5 truncate text-[10px] text-white/75 sm:text-[11px]">
            {subtitle}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function MagicalKenya() {
  return (
    <section className="overflow-hidden bg-[#F5F5F5]/80 py-7">

      {/* Infinite marquee */}
      <div className="relative overflow-hidden">
        {/* Soft edge fade */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#F5F5F5] to-transparent" />

        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#F5F5F5] to-transparent" />

        <div className="marquee-track flex w-max gap-3">
          {/* First set */}
          <div className="flex gap-3">
            {destinations.map((destination) => (
              <DestinationCard
                key={`first-${destination.name}`}
                {...destination}
              />
            ))}
          </div>

          {/* Identical second set */}
          <div
            className="flex gap-3"
            aria-hidden="true"
          >
            {destinations.map((destination) => (
              <DestinationCard
                key={`second-${destination.name}`}
                {...destination}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .marquee-track {
          animation: magicalKenya 38s linear infinite;
          will-change: transform;
        }

        // .marquee-track:hover {
        //   animation-play-state: paused;
        // }

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