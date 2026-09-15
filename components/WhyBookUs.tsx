"use client";

import {
  ShieldCheck,
  SearchCheck,
  MessageCircle,
  MapPin,
} from "lucide-react";

const BENEFITS = [
  {
    icon: SearchCheck,
    title: "Easy to find",
    description:
      "Search and discover comfortable stays by location, price, and your travel needs.",
  },
  {
    icon: ShieldCheck,
    title: "Clear & reliable",
    description:
      "See important property details, pricing, amenities, and booking information before you decide.",
  },
  {
    icon: MessageCircle,
    title: "Simple booking",
    description:
      "Connect with the property and confirm your stay without unnecessary steps.",
  },
  {
    icon: MapPin,
    title: "Made for Kenya",
    description:
      "Discover B&Bs and apartments across Kenya, from city stays to coastal getaways.",
  },
];

export default function WhyBookUs() {
  return (
    <section className="w-full bg-[#F7F7F7] px-[6%] py-18 md:py-18" id="why_choose_us">
      <div>
        {/* Heading */}
        <div className="mb-12 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-[#1B1A2E] md:text-4xl">
            Why Book With Us
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-6 text-[#36454F]/70 md:text-base">
            We make it easier to discover comfortable places to stay,
            understand what you are booking, and connect with the right
            property.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <div
                key={benefit.title}
                className="rounded-2xl border border-[#E5E2DA] bg-white p-6 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#D8D3C9] hover:shadow-sm"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAF9F6] text-[black]/80">
                  <Icon size={21} strokeWidth={1.8} />
                </div>

                <h3 className="text-base font-semibold text-[#1B1A2E]">
                  {benefit.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#36454F]/65">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
