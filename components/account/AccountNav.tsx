// FILE LOCATION: components/account/AccountNav.tsx
// Put this file at components/account/AccountNav.tsx in your project root (or src/components/account/AccountNav.tsx if your project has a src/ folder).

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { routes } from '@/app/lib/routes';
import { focusRing } from './ui';
import {
  Banknote,
  CalendarDays,
  House,
  LayoutDashboard,
  LogOut,
  MessageSquareQuote,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

const ITEMS = [
  { href: '/', label: 'Explore stays', icon: House },
  { href: '/account', label: 'Overview', icon: LayoutDashboard },
  { href: '/account/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/account/payments', label: 'Payments', icon: Banknote },
  { href: '/account/reviews', label: 'Reviews', icon: MessageSquareQuote },
  { href: '/account/payouts', label: 'Payouts', icon: Banknote, hostOnly: true },
  { href: '/account/profile', label: 'Profile', icon: UserRound },
  { href: '/account/security', label: 'Security', icon: ShieldCheck },
  { href: '/host', label: 'Host Panel', icon: LayoutDashboard, hostOnly: true },
];

export function AccountNav({ isHost }: { isHost: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-2 lg:flex-col">
        {ITEMS.filter((item) => !item.hostOnly || isHost).map((item) => {
          const active = item.href === '/account' ? pathname === '/account' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? 'bg-[#1B1A2E] font-semibold text-white shadow-[0_8px_18px_rgba(27,26,46,0.14)]'
                    : 'text-[#4B4A5A] hover:bg-white hover:text-[#1B1A2E] hover:shadow-sm'
                } ${focusRing}`}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SignOutButton({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace(routes.home);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#4B4A5A] transition hover:bg-white hover:text-[#1B1A2E] disabled:opacity-60 ${focusRing} ${className}`}
    >
      <LogOut size={16} aria-hidden="true" />
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}