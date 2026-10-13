"use client";

import { ShieldCheck, SearchCheck, MessageCircle, MapPin } from "lucide-react";

const BENEFITS = [
  {
    icon: SearchCheck,
    title: "Easy to find",
    description:
      "Filter by county, town, price, and dates to land on a stay that fits your trip — from Nairobi apartments to coastal getaways in Diani.",
  },
  {
    icon: ShieldCheck,
    title: "Clear & reliable",
    description:
      "Every host is verified before a listing goes live, so what you see is what you book — real photos, real pricing, no surprises.",
  },
  {
    icon: MessageCircle,
    title: "Simple booking",
    description:
      "Confirm and pay for your stay on the platform, then contact customer support for booking and check-in help.",
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
      className="w-full bg-[#F6F6F6] px-[6%] py-18"
      id="why_choose_us"
      aria-labelledby="why-book-us-heading"
    >
      {/* Heading */}
      <div className="mb-12 max-w-2xl">
        <h2
          id="why-book-us-heading"
          className="font-serif text-4xl font-semibold tracking-tight text-[#1F1F1F] md:text-[2.75rem]"
        >
          Why book with us
        </h2>

        <p className="mt-4 max-w-xl text-sm leading-6 text-[#6B6B6B] md:text-base">
          We make it easier to discover comfortable places to stay, understand
          what you are booking, and connect with the right property.
        </p>
      </div>

      {/* Benefits: one white panel split by hairlines instead of four separate cards.
          The grey container shows through the 1px gaps and draws the dividers. */}
      <ul
        role="list"
        className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-[#E6E6E6] sm:grid-cols-2 sm:border sm:border-[#E6E6E6] lg:grid-cols-4"
      >
        {BENEFITS.map((benefit) => {
          const Icon = benefit.icon;

          return (
            <li
              key={benefit.title}
              className={`p-6 text-left transition-colors duration-200 lg:p-7 ${
                benefit.highlight
                  ? "bg-[#EDEDED]"
                  : "bg-white hover:bg-[#FAFAFA]"
              }`}
            >
              <div
                className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${
                  benefit.highlight ? "bg-white" : "bg-[#F1F1F1]"
                }`}
              >
                <Icon
                  size={21}
                  strokeWidth={1.7}
                  aria-hidden="true"
                  className="text-[#2B2B2B]"
                />
              </div>

              <h3 className="text-base font-semibold text-[#1F1F1F]">
                {benefit.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
                {benefit.description}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}