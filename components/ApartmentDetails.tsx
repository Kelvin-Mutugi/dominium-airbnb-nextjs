import { useState } from "react";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  CalendarDays,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Video,
  Wifi,
} from "lucide-react";

export default function ApartmentDetails({ listing, onBack }) {
  const [selectedImage, setSelectedImage] = useState(listing.gallery[0]);

  if (!listing) return null;

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#1B1A2E]">
      <div className="mx-auto w-full max-w-[1500px] px-[3%] py-6 md:px-[4%] md:py-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E9E6DD] bg-white px-4 py-2 text-sm font-semibold text-[#1B1A2E] shadow-sm"
        >
          <ArrowLeft size={16} />
          Back to listings
        </button>

        <div className="overflow-hidden rounded-[28px] border border-[#E9E6DD] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="p-4 md:p-5">
              <div className="overflow-hidden rounded-[22px] bg-[#F3F1EE]">
                <img
                  src={selectedImage}
                  alt={listing.name}
                  className="h-[430px] w-full object-cover md:h-[560px] lg:h-[640px]"
                />
              </div>

              <div className="mt-4 grid grid-cols-4 gap-3">
                {listing.gallery.map((image, index) => (
                  <button
                    key={`${listing.id}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`overflow-hidden rounded-xl border-2 ${
                      selectedImage === image
                        ? "border-[#E89A1C]"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${listing.name} view ${index + 1}`}
                      className="h-[90px] w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 md:p-8">
              <div>
                {/* <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F5E9D6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[1px] text-[#1B1A2E]">
                  <Star size={12} fill="#E89A1C" className="text-[#E89A1C]" />
                  {listing.host}
                </div> */}

                <h1 className="font-['Anton',sans-serif] text-[clamp(28px,4vw,44px)] leading-none">
                  {listing.name}
                </h1>

                <div className="mt-3 flex items-center gap-2 text-[15px] text-[#3A3856]">
                  <MapPin size={16} className="text-[#E23E85]" />
                  {listing.loc}
                </div>

                <p className="mt-5 text-[16px] leading-7 text-[#3A3856]">
                  {listing.description}
                </p>
              </div>

              <div className="mt-8 rounded-[20px] border border-[#E9E6DD] bg-[#FAF9F6] p-5">
                <div className="mb-3 text-[12px] font-semibold uppercase tracking-[1px] text-[#3A3856]/70">
                  Price
                </div>
                <div className="text-[28px] font-bold text-[#1B1A2E]">
                  {listing.price}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-[#3A3856]">
                    <CalendarDays size={15} className="text-[#E89A1C]" />
                    Flexible dates
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-[#3A3856]">
                    <ShieldCheck size={15} className="text-[#E89A1C]" />
                    Verified stay
                  </div>
                </div>

                <a
                  href="#contact"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#128C7E] px-5 py-3 font-semibold text-white no-underline"
                >
                  <MessageCircle size={15} />
                  WhatsApp host
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <section className="rounded-[24px] border border-[#E9E6DD] bg-white p-6 shadow-sm">
            <h2 className="mb-5 font-['Anton',sans-serif] text-[28px] font-normal">
              About this place
            </h2>

            <p className="text-[16px] leading-7 text-[#3A3856]">
              {listing.description}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl bg-[#FAF9F6] p-3">
                <BedDouble size={18} className="text-[#E23E85]" />
                <span className="text-[15px] text-[#1B1A2E]">2 bedrooms</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-[#FAF9F6] p-3">
                <Bath size={18} className="text-[#E23E85]" />
                <span className="text-[15px] text-[#1B1A2E]">2 bathrooms</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-[#FAF9F6] p-3">
                <Wifi size={18} className="text-[#E23E85]" />
                <span className="text-[15px] text-[#1B1A2E]">Fast Wi‑Fi</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-[#FAF9F6] p-3">
                <ShieldCheck size={18} className="text-[#E23E85]" />
                <span className="text-[15px] text-[#1B1A2E]">Secure stay</span>
              </div>
            </div>
          </section>

          <aside className="rounded-[24px] border border-[#E9E6DD] bg-white p-6 shadow-sm">
            <h2 className="mb-5 font-['Anton',sans-serif] text-[28px] font-normal">
              Features
            </h2>

            <ul className="space-y-3 text-[15px] text-[#3A3856]">
              {listing.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E89A1C]" />
                  {feature}
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <section className="mt-10 rounded-[24px] border border-[#E9E6DD] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-[#1B1A2E]">
            <Video size={18} className="text-[#E23E85]" />
            <h2 className="font-['Anton',sans-serif] text-[28px] font-normal">
              Tour video
            </h2>
          </div>

          <video
            controls
            className="h-[500px] w-full rounded-2xl bg-black object-cover"
          >
            <source src={listing.video} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </section>
      </div>
    </div>
  );
}
