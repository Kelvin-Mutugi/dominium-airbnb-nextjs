// FILE LOCATION: components/account/AccountNav.tsx
// Put this file at components/account/AccountNav.tsx in your project root (or src/components/account/AccountNav.tsx if your project has a src/ folder).

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { routes } from '@/app/lib/routes';
import { focusRing } from './ui';

const ITEMS = [
  { href: '/account', label: 'Overview' },
  { href: '/account/bookings', label: 'Bookings' },
  { href: '/account/payments', label: 'Payments' },
  { href: '/account/reviews', label: 'Reviews' },
  { href: '/account/payouts', label: 'Payouts', hostOnly: true },
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/security', label: 'Security' },
];

export function AccountNav({ isHost }: { isHost: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {ITEMS.filter((item) => !item.hostOnly || isHost).map((item) => {
          const active = item.href === '/account' ? pathname === '/account' : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-teal-800 font-medium text-white'
                    : 'text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900'
                } ${focusRing}`}
              >
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
      className={`rounded-lg px-3 py-2 text-left text-sm text-neutral-600 transition hover:bg-neutral-200/60 hover:text-neutral-900 disabled:opacity-60 ${focusRing} ${className}`}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}