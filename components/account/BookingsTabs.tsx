// FILE LOCATION: components/account/BookingsTabs.tsx

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
      <div
        role="tablist"
        aria-label="Booking status"
        className="inline-flex gap-1 rounded-full bg-neutral-100 p-1"
      >
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
              className={`rounded-full px-4 py-2 text-sm transition ${
                active
                  ? 'bg-white font-semibold text-[#1B1A2E] shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800'
              } ${focusRing}`}
            >
              {t.label}
              {t.items.length > 0 && <span className="ml-1.5 text-neutral-400">{t.items.length}</span>}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="bookings-panel" aria-labelledby={`bookings-tab-${current.id}`} className="mt-5">
        {current.items.length ? (
          <div className="flex flex-col gap-4">
            {current.items.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        ) : (
          <EmptyState
            {...EMPTY[current.id]}
            href={current.id === 'upcoming' ? routes.listings : undefined}
            cta={current.id === 'upcoming' ? 'Browse stays' : undefined}
          />
        )}
      </div>
    </div>
  );
}