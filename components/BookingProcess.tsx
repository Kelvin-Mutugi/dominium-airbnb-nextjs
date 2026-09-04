import React from "react";
import { Search, MapPin, MessageCircle, CheckCircle2, Key } from "lucide-react";

const INK = "#1B1A2E";
const MARIGOLD = "#E89A1C";
const PINK = "#E23E85";
const PAPER_2 = "#FAF9F6";
const PAPER_3 = "#ebebeb";

const STEPS = [
  {
    icon: Search,
    title: "Search apartments",
    desc: "Filter by county, town, and price to find a place that fits.",
    accent: MARIGOLD,
    anim: "animate-pulse",
  },
  {
    icon: MapPin,
    title: "Pick your favorite",
    desc: "Browse real photos, amenities, and honest descriptions.",
    accent: PINK,
    anim: "animate-bounce",
  },
  {
    icon: MessageCircle,
    title: "Message on WhatsApp",
    desc: "Tap contact and chat directly \u2014 no forms, no waiting.",
    accent: MARIGOLD,
    anim: "animate-pulse",
  },
  {
    icon: CheckCircle2,
    title: "Confirm the details",
    desc: "Agree on dates and price directly with the host.",
    accent: PINK,
    anim: "animate-bounce",
  },
  {
    icon: Key,
    title: "Check in & stay",
    desc: "Arrive, settle in, and enjoy your trip.",
    accent: MARIGOLD,
    anim: "animate-pulse",
  },
];

export default function BookingProcess() {
  return (
    <section className="w-full bg-white px-[6%] py-20" id="booking_process">
      <style>{`
        @keyframes bp-flow {
          0%   { left: -6%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { left: 106%; opacity: 0; }
        }
        .bp-flow-dot {
          animation: bp-flow 4.5s linear infinite;
        }
        @keyframes bp-flow-v {
          0%   { top: -4%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { top: 104%; opacity: 0; }
        }
        .bp-flow-dot-v {
          animation: bp-flow-v 4.5s linear infinite;
        }
      `}</style>

      <div className="w-full">
        <div className="mb-16 text-left">
          <h2 className="font-['Anton',sans-serif] text-[30px] font-normal text-[#36454F]">
            Booking Process
          </h2>
          <p className="mt-4 text-slate-500 max-w-xl">
            In Just Five Steps.
          </p> 
        </div>

        {/* ---------- Desktop: horizontal flow ---------- */}
        <div className="hidden md:flex relative items-start justify-between gap-4">
          <div className="absolute top-10 left-0 right-0 h-px bg-slate-200 overflow-hidden">
            <div
              className="bp-flow-dot absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
              style={{ background: PINK }}
            />
          </div>

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative z-10 flex flex-col items-center text-center flex-1 px-2"
              >
                <div
                  className="relative flex items-center justify-center w-20 h-20 rounded-full flex-shrink-0"
                  style={{
                    background: PAPER_2,
                    boxShadow:
                      "10px 10px 22px rgba(178,172,152,0.35), -10px -10px 22px rgba(255,255,255,0.9)",
                  }}
                >
                  <Icon
                    className={`w-8 h-8 ${step.anim}`}
                    style={{
                      color: step.accent,
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                  <span
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-[#1B1A2E]"
                    style={{ background: PAPER_3 }}
                  >
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-bold text-base mt-6" style={{ color: INK }}>
                  {step.title}
                </h3>
                <p className="text-sm text-slate-500 mt-2 max-w-[170px]">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* ---------- Mobile: vertical flow ---------- */}
        <div className="flex md:hidden flex-col relative pl-4">
          <div className="absolute top-0 bottom-0 left-[38px] w-px bg-slate-200 overflow-hidden">
            <div
              className="bp-flow-dot-v absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full"
              style={{ background: PINK }}
            />
          </div>

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative flex items-start gap-5 pb-10 last:pb-0"
              >
                <div
                  className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full flex-shrink-0"
                  style={{
                    background: PAPER_2,
                    boxShadow:
                      "8px 8px 18px rgba(178,172,152,0.35), -8px -8px 18px rgba(255,255,255,0.9)",
                  }}
                >
                  <Icon
                    className={`w-7 h-7 ${step.anim}`}
                    style={{
                      color: step.accent,
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                  <span
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ background: INK }}
                  >
                    {i + 1}
                  </span>
                </div>
                <div className="pt-3">
                  <h3 className="font-bold text-base" style={{ color: INK }}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
