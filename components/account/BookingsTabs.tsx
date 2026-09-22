// FILE LOCATION: components/account/BookingsTabs.tsx
// Put this file at components/account/BookingsTabs.tsx in your project root (or src/components/account/BookingsTabs.tsx if your project has a src/ folder).

'use client';

import { useState } from 'react';
import { routes } from '@/app/lib/routes';
import type { BookingView } from '@/types/account';
import { BookingCard } from './BookingCard';
import { EmptyState, focusRing } from './ui';

type TabId = 'upcoming' | 'past' | 'cancelled';

const EMPTY: Record<TabId, { title: string; body: string }> = {
  upcoming: { title: 'Nothing coming up', body: 'Your next booking will show up here as soon as you make it.' },
  past: { title: 'No past stays yet', body: 'Once you’ve checked out of a stay, you’ll find it here and can review it.' },
  cancelled: { title: 'Nothing cancelled', body: 'Cancelled and expired bookings appear here.' },
};

export function BookingsTabs({
  upcoming,
  past,
  cancelled,
}: {
  upcoming: BookingView[];
  past: BookingView[];
  cancelled: BookingView[];
}) {
  const tabs: { id: TabId; label: string; items: BookingView[] }[] = [
    { id: 'upcoming', label: 'Upcoming', items: upcoming },
    { id: 'past', label: 'Past', items: past },
    { id: 'cancelled', label: 'Cancelled', items: cancelled },
  ];
  const [tab, setTab] = useState<TabId>(upcoming.length || !past.length ? 'upcoming' : 'past');
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <div>
      <div role="tablist" aria-label="Booking status" className="flex gap-6 border-b border-neutral-200">
        {tabs.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`bookings-tab-${t.id}`}
              aria-selected={active}
              aria-controls="bookings-panel"
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 pb-3 text-sm transition ${
                active
                  ? 'border-teal-800 font-medium text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              } ${focusRing}`}
            >
              {t.label} <span className="ml-1 text-neutral-400">{t.items.length}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="bookings-panel" aria-labelledby={`bookings-tab-${current.id}`} className="mt-2">
        {current.items.length ? (
          <div className="divide-y divide-neutral-200">
            {current.items.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState
              {...EMPTY[current.id]}
              href={current.id === 'upcoming' ? routes.listings : undefined}
              cta={current.id === 'upcoming' ? 'Browse stays' : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}