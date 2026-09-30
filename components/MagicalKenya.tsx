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
    <article className="group relative h-[145px] w-[145px] shrink-0 overflow-hidden rounded-2xl bg-gray-200 sm:w-[235px]">
      <img
        src={image}
        alt={name}
        loading="lazy"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Dark cinematic overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="text-[15px] font-semibold text-white">
          {name}
        </h3>

        <p className="mt-0.5 text-xs text-white/75">
          {subtitle}
        </p>
      </div>
    </article>
  );
}

export default function MagicalKenya() {
  return (
    <section className="overflow-hidden  py-7 bg-[#F5F5F5]/80">
      {/* Heading */}
      <div className="mx-auto mb-4 max-w-[1480px] px-6 lg:px-8">
        <div className="flex items-end justify-center">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E23E85] text-center">
              Discover Kenya
            </p>

            {/* <h2 className="text-2xl font-bold tracking-tight text-[#1B1A2E]">
              Magical Kenya
            </h2> */}
          </div>

          {/* <p className="hidden text-sm text-gray-500 sm:block">
            From the wild to the coast
          </p> */}
        </div>
      </div>

      {/* Infinite marquee */}
      <div className="relative overflow-hidden">
        {/* Soft edge fade */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />

        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />

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