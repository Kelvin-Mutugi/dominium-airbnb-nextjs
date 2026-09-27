'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Heart, MapPin, Star, Users } from 'lucide-react';
import { createClient } from '@/app/lib/supabase/client';
import type { Listing } from '@/types/types';

export default function SavedListings({
  listings,
  loadError,
}: {
  listings: Listing[];
  loadError: boolean;
}) {
  const [saved, setSaved] = useState(listings);
  const [error, setError] = useState(loadError ? 'Saved stays could not be loaded. Please refresh the page.' : '');
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function removeSavedListing(listingId: string) {
    setError('');
    setRemovingId(listingId);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Your session expired. Sign in again to manage saved stays.');
      setRemovingId(null);
      return;
    }

    const { error: deleteError } = await supabase
      .from('saved_listings')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId);

    if (deleteError) {
      console.error('Failed to remove saved listing:', deleteError);
      setError('We couldn’t remove that stay. Please try again.');
    } else {
      setSaved((current) => current.filter((listing) => listing.id !== listingId));
    }
    setRemovingId(null);
  }

  if (saved.length === 0 && !error) {
    return (
      <div className="border-y border-neutral-200 py-10 text-center">
        <Heart className="mx-auto text-neutral-400" size={24} aria-hidden="true" />
        <h2 className="mt-3 font-medium text-neutral-900">No saved stays yet</h2>
        <p className="mt-1 text-sm text-neutral-600">Save places while browsing to keep your shortlist here.</p>
        <Link href="/allListings" className="mt-4 inline-flex font-semibold text-rose-700 underline underline-offset-4">
          Browse stays
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && <p role="alert" className="mb-4 text-sm text-rose-700">{error}</p>}
      {saved.length > 0 && (
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
          {saved.map((listing) => (
            <li key={listing.id} className="grid gap-4 py-5 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center">
              <Link href={`/apartments/${listing.id}`} className="relative h-36 overflow-hidden bg-neutral-200 sm:h-28">
                {listing.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : <span className="flex h-full items-center justify-center text-sm text-neutral-500">No photo</span>}
              </Link>
              <div className="min-w-0">
                <Link href={`/apartments/${listing.id}`} className="font-semibold text-neutral-900 hover:underline">
                  {listing.title}
                </Link>
                <p className="mt-1 flex items-center gap-1 text-sm text-neutral-600">
                  <MapPin size={14} aria-hidden="true" />{listing.location || 'Location unavailable'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
                  <span className="inline-flex items-center gap-1"><Star size={14} aria-hidden="true" />{listing.rating.toFixed(1)} ({listing.reviewCount})</span>
                  <span>{listing.bedrooms} bedrooms</span>
                  <span className="inline-flex items-center gap-1"><Users size={14} aria-hidden="true" />{listing.guests} guests</span>
                </div>
                <p className="mt-2 text-sm text-neutral-600">{listing.amenities.slice(0, 4).join(' · ')}</p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <p className="font-semibold text-neutral-900">KES {listing.pricePerNight.toLocaleString()} <span className="font-normal text-neutral-500">/ night</span></p>
                <button
                  type="button"
                  onClick={() => void removeSavedListing(listing.id)}
                  disabled={removingId === listing.id}
                  className="text-sm font-medium text-neutral-600 underline underline-offset-4 hover:text-rose-700 disabled:opacity-50"
                >
                  {removingId === listing.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}