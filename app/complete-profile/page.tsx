"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

const heroImages = [
  {
    src: "https://images.unsplash.com/photo-1741991110666-88115e724741?q=80&w=1600&auto=format&fit=crop",
    alt: "Nairobi skyline on a sunny day",
  },
  {
    src: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?q=80&w=1600&auto=format&fit=crop",
    alt: "Bright modern living room interior",
  },
  {
    src: "https://images.unsplash.com/photo-1749930206000-179d0b85aa7e?q=80&w=1600&auto=format&fit=crop",
    alt: "Sleek modern living room",
  },
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [phone, setPhone] = useState("");
  const [wantsToHost, setWantsToHost] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^0\d{9}$/.test(phone)) {
      setError("Enter a valid phone number, e.g. 0712345678.");
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session expired — please sign in again.");
      setSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        phone,
        ...(wantsToHost ? { role: "host" } : {}),
      })
      .eq("id", user.id);

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push(wantsToHost ? "/host/onboarding" : "/");
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-[#f3efe9] font-sans">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden px-12 py-12 text-white">
        <div className="absolute inset-0 bg-black">
          {heroImages.map((img, i) => (
            <img
              key={img.src}
              src={img.src}
              alt={img.alt}
              className="absolute inset-0 h-full w-full object-cover opacity-0"
              style={{
                animation: "hero-fade 18s infinite",
                animationDelay: `${i * 6}s`,
              }}
              onError={(event) => {
                event.currentTarget.src = "/placeholder.svg";
              }}
            />
          ))}
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="relative z-10 animate-rise-in motion-reduce:animate-none">
          <span className="font-display text-[20px] tracking-wide">
            DOMINIUM <span className="text-[#ec1561]">AIRBNB</span>
          </span>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="w-full animate-rise-in motion-reduce:animate-none [animation-delay:180ms]">
            <h2 className="font-display text-[24px] leading-tight mb-3 tracking-wide">
              Complete your profile and unlock your next stay.
            </h2>
            <p className="text-[#e4e4e4] text-[14px] leading-relaxed max-w-[34ch]">
              Create your account details and get ready to book or host in
              Kenya.
            </p>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-center px-6 py-16"
        style={{
          backgroundColor: "#ffffff",
          backgroundImage:
            "radial-gradient(circle, rgba(18, 35, 29, 0.29) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8 animate-rise-in motion-reduce:animate-none">
            <span className="font-display text-[16px] text-[#12231d] tracking-wide">
              DOMINIUM <span className="text-[#ec1561]">AIRBNB</span>
            </span>
          </div>

          <div className="bg-[#ffffff] rounded-[18px] px-8 py-10 text-center border border-[#ece8e2] shadow-[0_20px_50px_rgba(18,35,29,0.06)] animate-rise-in motion-reduce:animate-none [animation-delay:120ms]">
            <h1 className="font-display text-[26px] text-[#12231d] mb-2 tracking-wide">
              Almost there
            </h1>
            <p className="text-[#4b5850] text-[15px] leading-relaxed mb-8">
              Just need a quick phone number before you continue.
            </p>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="space-y-[18px] text-left"
            >
              <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
                <span>Phone number</span>
                <input
                  type="tel"
                  required
                  placeholder="0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
                />
              </label>

              <label className="flex flex-row items-center gap-2.5 text-sm text-[#4b5850]">
                <input
                  type="checkbox"
                  checked={wantsToHost}
                  onChange={(e) => setWantsToHost(e.target.checked)}
                  className="h-4 w-4 accent-[#12231d]"
                />
                <span>I want to list a property as a host</span>
              </label>

              {error && (
                <p role="alert" className="text-[#a3352b] text-[13px] -mt-1.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-[3px] bg-[#12231d] text-[#f6f4ee] text-[15px] disabled:opacity-60 disabled:cursor-default"
              >
                {submitting ? "Saving…" : "Continue"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
