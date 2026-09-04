import { useState } from "react";
import {
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  CreditCard,
  Send,
  ChevronDown,
} from "lucide-react";

// lucide-react dropped brand/logo icons (licensing) — plain inline SVGs instead.
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.4l8.1-9.3L1 2h7.2l5 6.6L18.9 2Zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20Z" />
    </svg>
  );
}

const POPULAR_COUNTIES = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Kiambu",
  "Uasin Gishu",
  "Machakos",
  "Kilifi",
];

const COMPANY_LINKS = [
  { label: "About us", href: "/about" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Careers", href: "/careers" },
  { label: "Blog", href: "/blog" },
];

const GUEST_LINKS = [
  { label: "Browse listings", href: "/listings" },
  { label: "Help center", href: "/help" },
  { label: "Cancellation options", href: "/cancellation" },
  { label: "Safety information", href: "/safety" },
];

const HOST_LINKS = [
  { label: "List your property", href: "/host/signup" },
  { label: "Host resources", href: "/host/resources" },
  { label: "Responsible hosting", href: "/host/guidelines" },
  { label: "Host dashboard", href: "/host/dashboard" },
];

const LEGAL_LINKS = [
  { label: "Terms of service", href: "/legal/terms" },
  { label: "Privacy policy", href: "/legal/privacy" },
  { label: "Refund policy", href: "/legal/refunds" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!validEmail) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setSubscribed(true);
    // TODO: wire up to Supabase (e.g. insert into a `newsletter_subscribers` table)
    setEmail("");
  };

  const year = new Date().getFullYear();

  return (
    <footer className="bg-neutral-950 text-neutral-300">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
        {/* Brand + newsletter — full width, compact on mobile */}
        <div className="border-b border-neutral-800 pb-6 sm:pb-8 lg:flex lg:items-start lg:justify-between lg:gap-10 lg:border-none lg:pb-0">
          <div className="lg:max-w-xs">
            <a href="/" className="inline-flex items-center gap-2">
              <span className="text-base font-semibold text-white sm:text-lg">
                Dominium <span className="text-[#E23E85]">Airbnb</span>
              </span>
            </a>
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              Book short-term apartments across Kenya with confidence.
              Verified hosts, secure payments, stays for every county.
            </p>
          </div>

          <form
            onSubmit={handleSubscribe}
            className="mt-5 w-full lg:mt-0 lg:max-w-xs"
          >
            <label
              htmlFor="footer-email"
              className="mb-1.5 block text-xs font-medium text-neutral-200 sm:text-sm"
            >
              Get new listings in your inbox
            </label>
            <div className="flex gap-2">
              <input
                id="footer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="flex shrink-0 items-center gap-1.5 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-500"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Subscribe</span>
              </button>
            </div>
            {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
            {subscribed && !error && (
              <p className="mt-1.5 text-xs text-emerald-500">
                You're subscribed.
              </p>
            )}
          </form>
        </div>

        {/* Link columns — accordions on mobile, grid on desktop */}
        <div className="divide-y divide-neutral-800 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-8 sm:divide-y-0 lg:mt-10 lg:grid-cols-4 lg:gap-6">
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="For guests" links={GUEST_LINKS} />
          <FooterColumn title="For hosts" links={HOST_LINKS} />

          {/* Popular counties (kept flat, not an accordion, since it doubles as a search shortcut) */}
          <div className="py-4 sm:py-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white sm:text-sm">
              Popular counties
            </h3>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:mt-4 sm:block sm:space-y-2.5">
              {POPULAR_COUNTIES.map((county) => (
                <li key={county}>
                  <a
                    href={`/listings?county=${encodeURIComponent(county)}`}
                    className="flex items-center gap-1.5 text-sm text-neutral-400 transition hover:text-white"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{county}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact + trust strip */}
        <div className="mt-8 flex flex-col gap-4 border-t border-neutral-800 pt-6 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:pt-8">
          <div className="flex flex-col gap-2.5 text-sm text-neutral-400 xs:flex-row sm:flex-row sm:gap-6">
            <a
              href="mailto:support@dominiumairbnb.co.ke"
              className="flex items-center gap-2 transition hover:text-white"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="break-all">support@dominiumairbnb.co.ke</span>
            </a>
            <a
              href="tel:+254700000000"
              className="flex items-center gap-2 transition hover:text-white"
            >
              <Phone className="h-4 w-4 shrink-0" />
              +254 700 000 000
            </a>
          </div>

          <div className="flex items-center gap-4 text-neutral-400">
            <a href="#" aria-label="Facebook" className="transition hover:text-white">
              <FacebookIcon className="h-5 w-5" />
            </a>
            <a href="#" aria-label="Instagram" className="transition hover:text-white">
              <InstagramIcon className="h-5 w-5" />
            </a>
            <a href="#" aria-label="X (Twitter)" className="transition hover:text-white">
              <XIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 text-xs text-neutral-500 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Verified hosts and secure escrow payments
          </span>
          <span className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 shrink-0" />
            M-Pesa and card payments supported
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-neutral-800">
        <div className="mx-auto flex max-w-7xl flex-col-reverse items-center justify-between gap-3 px-4 py-5 text-xs text-neutral-500 sm:flex-row sm:gap-4 sm:px-6 sm:py-6">
          <p>© {year} Dominium Airbnb. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <>
      {/* Mobile: native accordion, zero JS, keeps the footer short */}
      <details className="group py-4 sm:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-wide text-white">
          {title}
          <ChevronDown className="h-4 w-4 text-neutral-500 transition group-open:rotate-180" />
        </summary>
        <ul className="mt-3 space-y-2.5">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm text-neutral-400 transition hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </details>

      {/* Desktop / tablet: always-expanded column */}
      <div className="hidden sm:block">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
          {title}
        </h3>
        <ul className="mt-4 space-y-2.5">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm text-neutral-400 transition hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}