// FILE LOCATION: components/account/AccountNav.tsx
// Put this file at components/account/AccountNav.tsx in your project root (or src/components/account/AccountNav.tsx if your project has a src/ folder).

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { focusRing } from './ui';
import {
  Banknote,
  CalendarDays,
  ChevronUp,
  Bell,
  LayoutDashboard,
  MessageSquareQuote,
  LifeBuoy,
  Heart,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

const MAIN_ITEMS = [
  { href: '/account', label: 'Overview', icon: LayoutDashboard },
  { href: '/account/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/account/saved', label: 'Saved stays', icon: Heart },
  { href: '/account/support', label: 'Support', icon: LifeBuoy },
  { href: '/account/profile', label: 'Profile', icon: UserRound },
];

const MORE_ITEMS = [
  { href: '/account/payments', label: 'Payments', icon: Banknote },
  { href: '/account/reviews', label: 'Reviews', icon: MessageSquareQuote },
  { href: '/account/notifications', label: 'Notifications', icon: Bell },
  { href: '/account/payouts', label: 'Payouts', icon: Banknote, hostOnly: true },
  { href: '/account/security', label: 'Security', icon: ShieldCheck },
];

export function AccountNav({ isHost }: { isHost: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/account' ? pathname === href : pathname.startsWith(href));
  const moreActive = MORE_ITEMS.some((item) => (!item.hostOnly || isHost) && isActive(item.href));
  const linkClass = (active: boolean) =>
    `flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] transition-all md:min-h-11 md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 md:text-sm ${
      active
        ? 'bg-[#FCE8F0] font-semibold text-[#9C2454] shadow-[inset_2px_2px_5px_rgba(156,36,84,0.08),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]'
        : 'text-[#4B4A5A] hover:bg-white/70 hover:text-[#1B1A2E] active:bg-neutral-100 md:hover:shadow-[4px_4px_8px_rgba(27,26,46,0.09),-4px_-4px_8px_rgba(255,255,255,0.95)] md:active:shadow-[inset_3px_3px_6px_rgba(27,26,46,0.06),inset_-3px_-3px_6px_rgba(255,255,255,0.9)]'
    } ${focusRing}`;

  return (
    <nav aria-label="Account" className="account-neu-inset fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-[#F7F7F9]/95 px-2 pt-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(27,26,46,0.10)] backdrop-blur md:static md:rounded-2xl md:p-2 md:shadow-none">
      <ul className="mx-auto grid max-w-xl grid-cols-6 gap-1 md:flex md:max-w-none md:flex-col">
        {MAIN_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? 'page' : undefined} aria-label={item.label} className={linkClass(active)}>
                <Icon size={19} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                <span className="md:hidden">{item.label === 'Saved stays' ? 'Saved' : item.label}</span>
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            </li>
          );
        })}
        {MORE_ITEMS.filter((item) => !item.hostOnly || isHost).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <li key={`desktop-${item.href}`} className="hidden md:block">
              <Link href={item.href} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="relative col-start-6 row-start-1 md:hidden">
          <details className="group">
            <summary aria-label="More account pages" className={`${linkClass(moreActive)} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
              <ChevronUp size={19} aria-hidden="true" className="transition-transform group-open:rotate-180 md:hidden" />
              <span className="md:hidden">More</span>
            </summary>
            <div className="account-neu-surface absolute bottom-full right-0 mb-2 w-64 rounded-2xl p-2">
              {MORE_ITEMS.filter((item) => !item.hostOnly || isHost).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`${linkClass(active)} md:min-h-11`}>
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </details>
        </li>
      </ul>
    </nav>
  );
}