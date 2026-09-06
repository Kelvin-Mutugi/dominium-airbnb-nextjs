"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  LogIn,
  LogOut,
  Menu,
  Settings,
  User,
  UserPlus,
  X,
} from "lucide-react";
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
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userName, setUserName] = useState("User");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    function syncUserState(user: any) {
      const nextName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "User";

      setUserName(nextName);
      setAvatarUrl(
        user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null,
      );
      setIsSignedIn(Boolean(user));
    }

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      syncUserState(user);
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserState(session?.user ?? null);
    });

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      subscription.unsubscribe();
    };
  }, []);

  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsSignedIn(false);
    setUserName("User");
    setAvatarUrl(null);
    router.push("/");
  }

  return (
    <div className="sticky top-0 z-[100] font-sans">
      <nav className="flex items-center justify-between gap-4 px-[6%] py-4 bg-white border-b border-[#E9E6DD]">
        {/* Logo */}
        <div className="font-display text-xl tracking-wide text-[#36454F] whitespace-nowrap shrink-0 max-[380px]:text-[17px]">
          DOMINIUM<span className="text-[#E23E85]"> AIRBNB</span>
        </div>

        <div className="hidden min-[681px]:flex flex-1 justify-center">
          {/* Desktop links */}
          <ul className="flex items-center gap-8 max-[900px]:gap-5 list-none m-0 p-0">
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
        </div>

        {/* Desktop CTA */}
        <div className="hidden min-[681px]:flex items-center gap-3 ml-auto">
          {isSignedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                aria-label="Open account menu"
                className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#D9D5CF] bg-[#E23E85] text-white shadow-[0_8px_18px_rgba(27,26,46,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B8B2A9]"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      const img = event.currentTarget;
                      img.style.display = "none";
                      const nextFallback =
                        img.nextElementSibling as HTMLElement | null;
                      if (nextFallback) {
                        nextFallback.style.display = "flex";
                      }
                    }}
                  />
                ) : null}

                <span
                  className={`flex items-center justify-center text-[13px] font-semibold tracking-wide ${avatarUrl ? "hidden" : "flex"}`}
                >
                  {initials}
                </span>

                {!avatarUrl && (
                  <span className="absolute inset-0 rounded-full bg-black/0 transition-colors group-hover:bg-black/5" />
                )}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 top-[calc(100%+12px)] w-64 overflow-hidden rounded-[18px] border border-[#E9E6DD] bg-white p-2 shadow-[0_20px_40px_rgba(18,35,29,0.08)]">
                  <div className="flex items-center gap-3 border-b border-[#F0EDE8] px-2 pb-3 pt-1">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#E23E85] text-[12px] font-semibold text-white">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={userName}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                            const fallback = event.currentTarget
                              .nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}

                      <span
                        className={`flex items-center justify-center text-[12px] font-semibold ${avatarUrl ? "hidden" : "flex"}`}
                      >
                        {initials}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#12231d]">
                        {userName}
                      </p>
                      <p className="truncate text-[11px] text-[#4b5850]">
                        Signed in
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        router.push("/account");
                      }}
                      className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left text-[13px] font-medium text-[#1B1A2E] transition-colors hover:bg-[#F7F5F2]"
                    >
                      <User size={15} />
                      My account
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        router.push("/host/onboarding");
                      }}
                      className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left text-[13px] font-medium text-[#1B1A2E] transition-colors hover:bg-[#F7F5F2]"
                    >
                      <CreditCard size={15} />
                      Become a host
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        router.push("/account");
                      }}
                      className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left text-[13px] font-medium text-[#1B1A2E] transition-colors hover:bg-[#F7F5F2]"
                    >
                      <Settings size={15} />
                      Account settings
                    </button>

                    <div className="my-2 border-t border-[#F0EDE8]" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        void handleSignOut();
                      }}
                      className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left text-[13px] font-medium text-[#a3352b] transition-colors hover:bg-[#fff5f3]"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
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
            <>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/account");
                }}
                className="mt-3 flex items-center justify-between gap-3 rounded-full border border-[#D9D5CF] bg-[#F7F5F2] px-[16px] py-[10px] text-left text-[13px] font-semibold text-[#1B1A2E]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#E9E6DD] text-[11px] font-bold text-[#1B1A2E]">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={userName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </span>
                  <span>{userName}</span>
                </span>
                <span className="text-[#4B4A5A]">Account</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void handleSignOut();
                }}
                className="mt-2 flex items-center justify-center gap-2 rounded-full border border-[#D9D5CF] bg-white px-[18px] py-[12px] text-[13px] font-semibold text-[#1B1A2E] no-underline"
              >
                <LogIn size={15} />
                Sign out
              </button>
            </>
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
