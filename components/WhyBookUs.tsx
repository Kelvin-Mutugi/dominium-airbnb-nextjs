"use client";

import { ShieldCheck, SearchCheck, MessageCircle, MapPin } from "lucide-react";

const BENEFITS = [
  {
    icon: SearchCheck,
    title: "Easy to find",
    description:
      "Filter by county, town, price, and dates to land on a stay that fits your trip — from Nairobi apartments to coastal getaways in Diani.",
    accent: {
      chip: "bg-[#F3E3C8]",
      icon: "text-[#B4762A]",
    },
  },
  {
    icon: ShieldCheck,
    title: "Clear & reliable",
    description:
      "Every host is verified before a listing goes live, so what you see is what you book — real photos, real pricing, no surprises.",
    accent: {
      chip: "bg-[#D6E7E5]",
      icon: "text-[#1F6F6F]",
    },
  },
  {
    icon: MessageCircle,
    title: "Simple booking",
    description:
      "Confirm and pay for your stay on the platform, then message your host directly to sort out check-in.",
    accent: {
      chip: "bg-[#EAD9CE]",
      icon: "text-[#B85C38]",
    },
  },
  {
    icon: MapPin,
    title: "Made for Kenya",
    description:
      "Local payment options, listings in every county, and a team that understands how people actually travel here.",
    highlight: true,
  },
];

export default function WhyBookUs() {
  return (
    <section
      className="relative w-full overflow-hidden bg-[#F7F4EE] px-[6%] py-18"
      id="why_choose_us"
      aria-labelledby="why-book-us-heading"
    >
      {/* Decorative background pattern — evokes a contour/topographic map, kept faint */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] text-[#1B1A2E]/[0.04] md:h-[520px] md:w-[520px]"
        viewBox="0 0 400 400"
        fill="none"
      >
        {[40, 80, 120, 160, 200].map((r) => (
          <circle
            key={r}
            cx="200"
            cy="200"
            r={r}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      <div className="relative">
        {/* Heading */}
        <div className="mb-14 max-w-2xl">
          <h2
            id="why-book-us-heading"
            className="font-serif text-4xl font-semibold tracking-tight text-[#1B1A2E] md:text-[2.75rem]"
          >
            Why book with us
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-6 text-[#36454F]/70 md:text-base">
            We make it easier to discover comfortable places to stay,
            understand what you are booking, and connect with the right
            property.
          </p>
        </div>

        {/* Benefits */}
        <ul
          role="list"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            const isHighlight = benefit.highlight;

            return (
              <li
                key={benefit.title}
                className={`group rounded-2xl border p-6 text-left transition-colors duration-200 ${
                  isHighlight
                    ? "border-[#1B1A2E] bg-[#1B1A2E]"
                    : "border-[#E5E2DA] bg-white hover:border-[#D8D3C9]"
                }`}
              >
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
                    isHighlight ? "bg-white/10" : (benefit.accent?.chip ?? "")
                  }`}
                >
                  <Icon
                    size={22}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className={isHighlight ? "text-white" : (benefit.accent?.icon ?? "")}
                  />
                </div>

                <h3
                  className={`text-base font-semibold ${
                    isHighlight ? "text-white" : "text-[#1B1A2E]"
                  }`}
                >
                  {benefit.title}
                </h3>

                <p
                  className={`mt-2 text-sm leading-6 ${
                    isHighlight ? "text-white/70" : "text-[#36454F]/65"
                  }`}
                >
                  {benefit.description}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}