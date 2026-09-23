"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  Minus,
  Plus,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";
import logo from "@/app/assets/logo.png";
import type { LucideIcon } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/app/lib/supabase/client";

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

const NAV_HEIGHT = 72; // px, must match h-[72px] / lg:-mb-[72px] below
const HERO_ROUTES = ["/"]; // pages that start with a full-bleed hero
const MAX_GUESTS = 16;

// Main ways to browse: these stay prominent inside the menu
const EXPLORE_LINKS = [
  { label: "All Listings", href: "/allListings", icon: LayoutGrid },
  { label: "Explore by County", href: "/explore-by-county", icon: MapPin },
];

// Everything else moves out of the top bar and into the menu
const INFO_LINKS = [
  { label: "Booking Process", href: "/#booking_process" },
  { label: "Why Choose Us", href: "/#why_choose_us" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Refund & Cancellation Policy", href: "/refund-cancellation-policy" },
  {label: "Host Listing Agreement & Terms of Service", href: "/host-listing-agreement-and-terms-of-service"}
];

// Quick picks in the search panel
const POPULAR_COUNTIES = [
  "Nairobi",
  "Mombasa",
  "Kilifi",
  "Kwale",
  "Nakuru",
  "Laikipia",
  "Kisumu",
  "Kajiado",
];

type SearchField = "where" | "in" | "out" | "who";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85]";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function toISODate(d: Date) {
  // local date, not UTC, so "today" is right in Nairobi at 1am too
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatRange(checkIn: string, checkOut: string) {
  if (checkIn && checkOut) return `${shortDate(checkIn)} – ${shortDate(checkOut)}`;
  if (checkIn) return `From ${shortDate(checkIn)}`;
  if (checkOut) return `Until ${shortDate(checkOut)}`;
  return "Any week";
}

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

function Avatar({
  url,
  name,
  initials,
  signedIn,
  className = "",
}: {
  url: string | null;
  name: string;
  initials: string;
  signedIn: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white ${
        signedIn ? "bg-[#E23E85]" : "bg-[#8A8797]"
      } ${className}`}
    >
      {signedIn && url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : signedIn ? (
        <span className="text-[12px] font-semibold">{initials}</span>
      ) : (
        <User size={16} />
      )}
    </span>
  );
}

function MenuItem({
  href,
  icon: Icon,
  onNavigate,
  emphasis = false,
  subtle = false,
  children,
}: {
  href: string;
  icon?: LucideIcon;
  onNavigate: () => void;
  emphasis?: boolean;
  subtle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-3 no-underline transition-colors hover:bg-[#F7F5F2] ${focusRing} ${
        subtle
          ? "py-2 text-[13px] font-medium text-[#4B4A5A]"
          : emphasis
            ? "py-2.5 text-[14px] font-semibold text-[#1B1A2E]"
            : "py-2.5 text-[14px] font-medium text-[#3A3856]"
      }`}
    >
      {Icon ? <Icon size={16} className="text-[#6B6A78]" /> : null}
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Navbar                                                                    */
/* -------------------------------------------------------------------------- */

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const whereRef = useRef<HTMLInputElement | null>(null);
  const checkInRef = useRef<HTMLInputElement | null>(null);
  const checkOutRef = useRef<HTMLInputElement | null>(null);

  // auth
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userName, setUserName] = useState("User");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  // ui
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeField, setActiveField] = useState<SearchField>("where");
  const [pastHero, setPastHero] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // search values
  const [where, setWhere] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(0);

  const hasHero = HERO_ROUTES.includes(pathname ?? "");

  // Hero is sitting under the navbar: hero page, hero in view, nothing open.
  // The transparent styling only applies from lg up (see the `lg:` classes).
  const overHero = hasHero && !pastHero && !menuOpen && !searchOpen;

  /* ------------------------------ auth state ------------------------------ */

  useEffect(() => {
    function syncUserState(user: SupabaseUser | null) {
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
      if (!user) setIsHost(false);
    }

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      syncUserState(user);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setIsHost(profile?.role === "host");
      }
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserState(session?.user ?? null);
      if (session?.user) {
        void supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => setIsHost(profile?.role === "host"));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ------------------- outside click, Escape, route change ---------------- */

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Full-screen search sheet on phones: stop the page scrolling behind it
  useEffect(() => {
    if (!searchOpen) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [searchOpen]);

  // Focus the field the person tapped (desktop only, so phones don't pop the keyboard)
  useEffect(() => {
    if (!searchOpen) return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const el =
      activeField === "where"
        ? whereRef.current
        : activeField === "in"
          ? checkInRef.current
          : activeField === "out"
            ? checkOutRef.current
            : null;
    el?.focus();
  }, [searchOpen, activeField]);

  /* ------------------------------ scroll state ---------------------------- */

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track whether the hero section has scrolled out from under the navbar
  useEffect(() => {
    if (!hasHero) {
      setPastHero(false);
      return;
    }

    function checkHero() {
      const hero = document.getElementById("home"); // your existing <section id="home">
      const heroBottom = hero
        ? hero.getBoundingClientRect().bottom
        : window.innerHeight * 0.35 - window.scrollY; // fallback: the hero's 35vh
      setPastHero(heroBottom <= NAV_HEIGHT);
    }

    checkHero();
    window.addEventListener("scroll", checkHero, { passive: true });
    window.addEventListener("resize", checkHero);
    return () => {
      window.removeEventListener("scroll", checkHero);
      window.removeEventListener("resize", checkHero);
    };
  }, [hasHero, pathname]);

  /* -------------------------------- actions ------------------------------- */

  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U";

  async function handleSignOut() {
    await supabase.auth.signOut();
    setIsSignedIn(false);
    setUserName("User");
    setAvatarUrl(null);
    router.push("/");
  }

  function openSearch(field: SearchField) {
    setMenuOpen(false);
    setActiveField(field);
    setSearchOpen(true);
  }

  function toggleMenu() {
    setSearchOpen(false);
    setMenuOpen((prev) => !prev);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleCheckIn(value: string) {
    setCheckIn(value);
    if (checkOut && value && checkOut < value) setCheckOut("");
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (where.trim()) params.set("location", where.trim());
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests > 0) params.set("guests", String(guests));

    const qs = params.toString();
    setSearchOpen(false);
    router.push(`/allListings${qs ? `?${qs}` : ""}`);
  }

  /* -------------------------------- derived ------------------------------- */

  const whereLabel = where.trim() || "Anywhere";
  const whenLabel = formatRange(checkIn, checkOut);
  const whoLabel =
    guests > 0 ? `${guests} guest${guests > 1 ? "s" : ""}` : "Add guests";

  const today = toISODate(new Date());

  const navSurface = overHero
    ? "border-[#E9E6DD] bg-white lg:border-transparent lg:bg-transparent lg:[background-image:linear-gradient(to_bottom,rgba(0,0,0,0.55),rgba(0,0,0,0))]"
    : `border-[#E9E6DD] bg-white ${
        scrolled ? "shadow-[0_1px_14px_rgba(27,26,46,0.07)]" : ""
      }`;

  // On md+ every field is a fixed 64px-tall pill, so the row lines up with the
  // Search button no matter what the content does.
  const fieldClass =
    "rounded-2xl border border-[#E9E6DD] px-5 py-3 transition-colors focus-within:border-[#E23E85] md:flex md:h-16 md:min-w-0 md:flex-col md:justify-center md:rounded-full md:border-transparent md:py-0 md:hover:bg-[#F7F5F2] md:focus-within:border-transparent md:focus-within:bg-[#F7F5F2]";
  const labelClass =
    "block text-[12px] font-semibold leading-tight text-[#1B1A2E]";
  const inputClass =
    "mt-0.5 w-full min-w-0 bg-transparent text-sm leading-tight text-[#1B1A2E] outline-none placeholder:text-[#8A8797]";

  /* --------------------------------- render ------------------------------- */

  return (
    <div
      className={`sticky top-0 z-[100] font-sans ${hasHero ? "lg:-mb-[72px]" : ""}`}
    >
      <nav
        className={`flex h-[72px] items-center gap-3 border-b px-4 transition-colors duration-300 sm:px-[5%] md:grid md:grid-cols-[1fr_auto_1fr] ${navSurface}`}
      >
        {/* ---------------------------- Logo ---------------------------- */}
        <Link
          href="/"
          aria-label="Dominium Airbnb, home"
          className={`flex shrink-0 items-center gap-2.5 no-underline ${focusRing} rounded-lg`}
        >
            <img src={logo.src} alt="Dominium Airbnb Logo" className="h-9 w-8" />  
          <span
            className={`hidden font-display text-xl tracking-wide whitespace-nowrap transition-colors duration-300 sm:block ${
              overHero ? "text-[#36454F] lg:text-white" : "text-[#36454F]"
            }`}
          >
            Dominium<span className="text-[#E23E85]"> Airbnb</span>
          </span>
        </Link>

        {/* ------------------------- Search pill ------------------------ */}
        <div ref={searchRef} className="min-w-0 flex-1 md:flex-none md:justify-self-center">
          {/* Phone: one tappable card */}
          <button
            type="button"
            onClick={() => openSearch("where")}
            aria-label="Search stays"
            aria-expanded={searchOpen}
            className={`flex h-12 w-full items-center gap-3 rounded-full border border-[#E1DDD6] bg-white px-4 text-left shadow-[0_2px_10px_rgba(27,26,46,0.10)] md:hidden ${focusRing}`}
          >
            <Search size={17} className="shrink-0 text-[#E23E85]" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-[#1B1A2E]">
                {where.trim() ? whereLabel : "Where to?"}
              </span>
              <span className="block truncate text-[11.5px] text-[#6B6A78]">
                {whenLabel}, {whoLabel.toLowerCase()}
              </span>
            </span>
          </button>

          {/* Tablet and up: segmented pill */}
          <div className="hidden h-12 items-center rounded-full border border-[#E1DDD6] bg-white pl-2 pr-1.5 shadow-[0_2px_10px_rgba(27,26,46,0.10)] transition-shadow hover:shadow-[0_4px_16px_rgba(27,26,46,0.16)] md:flex">
            <button
              type="button"
              onClick={() => openSearch("where")}
              className={`max-w-[150px] truncate rounded-full px-4 py-2 text-sm hover:bg-[#F7F5F2] ${focusRing} ${
                where.trim()
                  ? "font-semibold text-[#1B1A2E]"
                  : "font-medium text-[#3A3856]"
              }`}
            >
              {whereLabel}
            </button>
            <span className="h-6 w-px bg-[#E1DDD6]" aria-hidden="true" />
            <button
              type="button"
              onClick={() => openSearch("in")}
              className={`max-w-[160px] truncate rounded-full px-4 py-2 text-sm hover:bg-[#F7F5F2] ${focusRing} ${
                checkIn || checkOut
                  ? "font-semibold text-[#1B1A2E]"
                  : "font-medium text-[#3A3856]"
              }`}
            >
              {whenLabel}
            </button>
            <span className="h-6 w-px bg-[#E1DDD6]" aria-hidden="true" />
            <button
              type="button"
              onClick={() => openSearch("who")}
              className={`max-w-[130px] truncate rounded-full px-4 py-2 text-sm hover:bg-[#F7F5F2] ${focusRing} ${
                guests > 0
                  ? "font-semibold text-[#1B1A2E]"
                  : "font-medium text-[#6B6A78]"
              }`}
            >
              {whoLabel}
            </button>
            <button
              type="button"
              onClick={() => openSearch("where")}
              aria-label="Open search"
              className={`ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#E23E85] text-white transition-colors hover:bg-[#cf2f74] ${focusRing}`}
            >
              <Search size={16} strokeWidth={2.4} />
            </button>
          </div>

          {/* ------------------------ Search panel ------------------------ */}
          {searchOpen && (
            <div
              role="dialog"
              aria-label="Search stays"
              className="fixed inset-0 z-[110] overflow-y-auto bg-white p-5 md:absolute md:inset-auto md:left-1/2 md:top-[80px] md:w-[min(920px,calc(100vw-2rem))] md:-translate-x-1/2 md:overflow-visible md:rounded-[32px] md:border md:border-[#E9E6DD] md:p-3 md:shadow-[0_24px_60px_rgba(18,35,29,0.16)]"
            >
              {/* Phone header */}
              <div className="mb-5 flex items-center justify-between md:hidden">
                <h2 className="font-display text-xl text-[#1B1A2E]">
                  Find your stay
                </h2>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  className={`flex h-10 w-10 items-center justify-center rounded-full border border-[#D9D5CF] text-[#1B1A2E] ${focusRing}`}
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={handleSearch}
                className="flex flex-col gap-3 md:grid md:grid-cols-[1.3fr_1fr_1fr_minmax(190px,1.1fr)_auto] md:items-center md:gap-1"
              >
                <div className={fieldClass}>
                  <label htmlFor="nav-where" className={labelClass}>
                    Where
                  </label>
                  <input
                    id="nav-where"
                    ref={whereRef}
                    type="text"
                    value={where}
                    onChange={(e) => setWhere(e.target.value)}
                    placeholder="Search county or town"
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>

                <div className={fieldClass}>
                  <label htmlFor="nav-check-in" className={labelClass}>
                    Check in
                  </label>
                  <input
                    id="nav-check-in"
                    ref={checkInRef}
                    type="date"
                    min={today}
                    value={checkIn}
                    onChange={(e) => handleCheckIn(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className={fieldClass}>
                  <label htmlFor="nav-check-out" className={labelClass}>
                    Check out
                  </label>
                  <input
                    id="nav-check-out"
                    ref={checkOutRef}
                    type="date"
                    min={checkIn || today}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div
                  className={`${fieldClass} ${
                    activeField === "who" ? "md:bg-[#F7F5F2]" : ""
                  }`}
                >
                  <span className={labelClass}>Who</span>
                  <div className="mt-0.5 flex items-center justify-between gap-3">
                    <span
                      className={`whitespace-nowrap text-sm leading-tight ${
                        guests > 0 ? "text-[#1B1A2E]" : "text-[#8A8797]"
                      }`}
                    >
                      {whoLabel}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGuests((g) => Math.max(0, g - 1))}
                        disabled={guests <= 0}
                        aria-label="Remove a guest"
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#C9C5BD] text-[#3A3856] transition-colors hover:border-[#1B1A2E] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#C9C5BD] ${focusRing}`}
                      >
                        <Minus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setGuests((g) => Math.min(MAX_GUESTS, g + 1))
                        }
                        disabled={guests >= MAX_GUESTS}
                        aria-label="Add a guest"
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#C9C5BD] text-[#3A3856] transition-colors hover:border-[#1B1A2E] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#C9C5BD] ${focusRing}`}
                      >
                        <Plus size={14} />
                      </button>
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  aria-label="Search"
                  className={`flex h-12 items-center justify-center gap-2 rounded-full bg-[#E23E85] px-7 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(226,62,133,0.28)] transition-colors hover:bg-[#cf2f74] md:h-16 md:w-16 md:shrink-0 md:px-0 lg:w-auto lg:px-7 ${focusRing}`}
                >
                  <Search size={16} strokeWidth={2.4} />
                  <span className="md:sr-only lg:not-sr-only">Search</span>
                </button>
              </form>

              <div className="mt-6 md:mt-3 md:px-5 md:pb-2">
                <p className="mb-2 text-[12px] font-semibold text-[#6B6A78]">
                  Popular counties
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_COUNTIES.map((county) => (
                    <button
                      key={county}
                      type="button"
                      onClick={() => {
                        setWhere(county);
                        setActiveField("in");
                        checkInRef.current?.focus();
                      }}
                      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${focusRing} ${
                        where === county
                          ? "border-[#E23E85] bg-[#FDF0F5] text-[#E23E85]"
                          : "border-[#E9E6DD] text-[#3A3856] hover:border-[#E23E85] hover:text-[#E23E85]"
                      }`}
                    >
                      {county}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---------------------- Host link + menu ---------------------- */}
        <div className="flex shrink-0 items-center gap-1 md:justify-self-end">
          <Link
            href={isHost ? "/host" : "/host/onboarding"}
            className={`hidden rounded-full px-4 py-2.5 text-sm font-semibold no-underline transition-colors lg:inline-block ${focusRing} ${
              overHero
                ? "text-[#1B1A2E] hover:bg-[#F7F5F2] lg:text-white lg:hover:bg-white/15"
                : "text-[#1B1A2E] hover:bg-[#F7F5F2]"
            }`}
          >
            {isHost ? "Host panel" : "Become a host"}
          </Link>

          <div ref={menuRef} className="sm:relative">
            <button
              type="button"
              onClick={toggleMenu}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={`flex h-11 items-center gap-2 rounded-full border border-[#D9D5CF] bg-white py-1 pl-3 pr-1 text-[#1B1A2E] shadow-[0_2px_8px_rgba(27,26,46,0.08)] transition-shadow hover:shadow-[0_4px_14px_rgba(27,26,46,0.16)] ${focusRing}`}
            >
              {menuOpen ? <X size={17} /> : <Menu size={17} />}
              <Avatar
                url={avatarUrl}
                name={userName}
                initials={initials}
                signedIn={isSignedIn}
                className="h-8 w-8"
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="fixed inset-x-3 top-[80px] z-[110] max-h-[calc(100vh-96px)] overflow-y-auto rounded-[22px] border border-[#E9E6DD] bg-white p-2 shadow-[0_20px_40px_rgba(18,35,29,0.10)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+12px)] sm:w-[288px]"
              >
                {isSignedIn ? (
                  <>
                    <Link
                      href="/account"
                      role="menuitem"
                      onClick={closeMenu}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline transition-colors hover:bg-[#F7F5F2] ${focusRing}`}
                    >
                      <Avatar
                        url={avatarUrl}
                        name={userName}
                        initials={initials}
                        signedIn
                        className="h-10 w-10"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold text-[#1B1A2E]">
                          {userName}
                        </span>
                        <span className="block text-[12px] text-[#6B6A78]">
                          View your account
                        </span>
                      </span>
                    </Link>
                    <MenuItem
                      href="/account/bookings"
                      icon={CalendarDays}
                      onNavigate={closeMenu}
                    >
                      My bookings
                    </MenuItem>
                    <MenuItem
                      href="/account/profile"
                      icon={Settings}
                      onNavigate={closeMenu}
                    >
                      Account settings
                    </MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem href="/signup" onNavigate={closeMenu} emphasis>
                      Sign up
                    </MenuItem>
                    <MenuItem href="/signin" onNavigate={closeMenu}>
                      Log in
                    </MenuItem>
                  </>
                )}

                {/* Host entry */}
                <Link
                  href={isHost ? "/host" : "/host/onboarding"}
                  role="menuitem"
                  onClick={closeMenu}
                  className={`my-2 flex items-center gap-3 rounded-2xl bg-[#FDF0F5] px-3 py-3 no-underline transition-colors hover:bg-[#FBE4EE] ${focusRing}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#E23E85]">
                    <Home size={17} />
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold text-[#1B1A2E]">
                      {isHost ? "Host panel" : "Become a host"}
                    </span>
                    <span className="block text-[12px] text-[#6B6A78]">
                      {isHost ? "Manage your listings and bookings" : "Turn your space into income"}
                    </span>
                  </span>
                </Link>

                <div className="my-1 border-t border-[#F0EDE8]" />
                {EXPLORE_LINKS.map((link) => (
                  <MenuItem
                    key={link.href}
                    href={link.href}
                    icon={link.icon}
                    onNavigate={closeMenu}
                  >
                    {link.label}
                  </MenuItem>
                ))}

                <div className="my-1 border-t border-[#F0EDE8]" />
                {INFO_LINKS.map((link) => (
                  <MenuItem
                    key={link.label}
                    href={link.href}
                    onNavigate={closeMenu}
                    subtle
                  >
                    {link.label}
                  </MenuItem>
                ))}

                {isSignedIn && (
                  <>
                    <div className="my-1 border-t border-[#F0EDE8]" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        closeMenu();
                        void handleSignOut();
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-[#a3352b] transition-colors hover:bg-[#fff5f3] ${focusRing}`}
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}