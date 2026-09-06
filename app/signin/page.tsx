"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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

export default function SigninPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const supabase = createClient();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailSignIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email: form.email,
        password: form.password,
      },
    );

    setLoading(false);

    if (signInError || !data.user) {
      setError(signInError?.message || "Unable to sign in. Please try again.");
      return;
    }

    router.push(redirectTo);
  }

  async function handleGoogleSignin() {
    setError(null);
    setGoogleLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          redirectTo,
        )}`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
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
              Welcome back to your next stay.
            </h2>
            <p className="text-[#e4e4e4] text-[14px] leading-relaxed max-w-[34ch]">
              Sign in to manage bookings, continue hosting, and keep your travel
              plans moving.
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
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8 animate-rise-in motion-reduce:animate-none">
            <span className="font-display text-[16px] text-[#12231d] tracking-wide">
              DOMINIUM <span className="text-[#ec1561]">AIRBNB</span>
            </span>
          </div>

          <div className="bg-[#ffffff] rounded-[18px] px-8 py-10 border border-[#ece8e2] shadow-[0_20px_50px_rgba(18,35,29,0.06)] animate-rise-in motion-reduce:animate-none [animation-delay:120ms]">
            <h1 className="font-display text-[26px] text-[#12231d] mb-2 tracking-wide text-center">
              Sign in
            </h1>
            <p className="text-[#4b5850] text-[15px] leading-relaxed mb-8 text-center">
              Access your saved stays and continue hosting with confidence.
            </p>

            <button
              type="button"
              onClick={handleGoogleSignin}
              disabled={googleLoading || loading}
              className="group relative w-full flex items-center justify-center gap-3 py-3 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] text-[15px] transition-all duration-150 ease-out hover:border-[#ec1561]/50 hover:-translate-y-[1px] hover:shadow-[0_6px_16px_rgba(236,21,97,0.12)] active:translate-y-0 active:scale-[0.99] disabled:opacity-60 disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {googleLoading ? (
                <span className="flex items-center gap-1.5" aria-live="polite">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#12231d] animate-dot-pulse motion-reduce:animate-none" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#12231d] animate-dot-pulse motion-reduce:animate-none [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#12231d] animate-dot-pulse motion-reduce:animate-none [animation-delay:300ms]" />
                  <span className="ml-2">Redirecting…</span>
                </span>
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
                    />
                    <path
                      fill="#34A853"
                      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z"
                    />
                    <path
                      fill="#EA4335"
                      d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#dfe5df]" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-[0.2em] text-[#6b706a]">
                <span className="bg-white px-2">or with email</span>
              </div>
            </div>

            <form
              onSubmit={handleEmailSignIn}
              noValidate
              className="space-y-[18px] text-left"
            >
              <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="you@example.com"
                  className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
                <span>Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={form.password}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="••••••••"
                    className="w-full pr-10 text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5850] hover:text-[#12231d]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-[12px] font-medium text-[#12231d] no-underline hover:text-[#ec1561]"
                >
                  Forgot password?
                </Link>
              </div>

              {error && (
                <p role="alert" className="text-[#a3352b] text-[13px] -mt-1.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3 rounded-[3px] bg-[#12231d] text-[#f6f4ee] text-[15px] disabled:opacity-60 disabled:cursor-default"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="text-[#4b5850] text-[13px] mt-8 text-center">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-[#12231d] no-underline hover:text-[#ec1561]"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
