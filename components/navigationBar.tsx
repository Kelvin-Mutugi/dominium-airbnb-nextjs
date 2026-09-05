"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Menu, UserPlus, X } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

interface NavLink {
  label: string;
  href: string;
}

const LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Listings", href: "/#listings" },
  { label: "Booking Process", href: "/#booking_process" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Blog", href: "/blog" },
];

export default function Navbar() {
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsSignedIn(Boolean(user));
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user));
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsSignedIn(false);
    router.push("/");
  }

  return (
    <div className="sticky top-0 z-[100] font-sans">
      <nav className="flex items-center justify-between gap-5 px-[6%] py-4 bg-white border-b border-[#E9E6DD]">
        {/* Logo */}
        <div className="font-display text-xl tracking-wide text-[#36454F] whitespace-nowrap shrink-0 max-[380px]:text-[17px]">
          DOMINIUM<span className="text-[#E23E85]"> AIRBNB</span>
        </div>

        {/* Desktop links */}
        <ul className="hidden min-[681px]:flex items-center gap-8 max-[900px]:gap-5 list-none m-0 p-0">
          {LINKS.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="text-sm font-medium text-[#3A3856] hover:text-[#1B1A2E] no-underline transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden min-[681px]:flex items-center gap-3 ml-auto">
          {isSignedIn ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D9D5CF] bg-white px-[18px] py-[10px] text-[13px] font-semibold text-[#1B1A2E] no-underline shadow-[0_8px_18px_rgba(27,26,46,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B8B2A9] hover:bg-[#F7F5F2]"
            >
              <LogIn size={15} />
              Sign out
            </button>
          ) : (
            <>
              <Link
                href="/signin"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D9D5CF] bg-white px-[18px] py-[10px] text-[13px] font-semibold text-[#1B1A2E] no-underline shadow-[0_8px_18px_rgba(27,26,46,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B8B2A9] hover:bg-[#F7F5F2]"
              >
                <LogIn size={15} />
                Sign in
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E23E85] px-[20px] py-[10px] text-[13px] font-semibold text-white no-underline shadow-[0_14px_28px_rgba(226,62,133,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#cf2f74]"
              >
                <UserPlus size={15} />
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="hidden max-[680px]:inline-flex bg-transparent border-none text-[#1B1A2E] cursor-pointer p-1 shrink-0"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="hidden max-[680px]:flex flex-col gap-0.5 bg-white border-b border-[#E9E6DD] px-[6%] pb-5 pt-2">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-[#3A3856] no-underline py-[14px] px-1 text-[15px] border-b border-[#E9E6DD]"
            >
              {link.label}
            </Link>
          ))}
          {isSignedIn ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void handleSignOut();
              }}
              className="mt-3 flex items-center justify-center gap-2 rounded-full border border-[#D9D5CF] bg-white px-[18px] py-[12px] text-[13px] font-semibold text-[#1B1A2E] no-underline"
            >
              <LogIn size={15} />
              Sign out
            </button>
          ) : (
            <>
              <Link
                href="/signin"
                onClick={() => setOpen(false)}
                className="mt-3 flex items-center justify-center gap-2 rounded-full border border-[#D9D5CF] bg-white px-[18px] py-[12px] text-[13px] font-semibold text-[#1B1A2E] no-underline"
              >
                <LogIn size={15} />
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#E23E85] px-[18px] py-[12px] text-[13px] font-semibold text-white no-underline shadow-[0_12px_24px_rgba(226,62,133,0.2)]"
              >
                <UserPlus size={15} />
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
