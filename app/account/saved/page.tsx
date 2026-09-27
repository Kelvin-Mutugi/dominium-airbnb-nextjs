import { getAccountContext } from '@/app/lib/account';
import SavedListings from '@/components/account/SavedListings';
import type { Listing } from '@/types/types';

export const metadata = {
  title: 'Saved stays | Dominium BnB',
  robots: { index: false },
};

export default async function SavedListingsPage() {
  const { supabase, user } = await getAccountContext();
  const { data: savedRows, error: savedError } = await supabase
    .from('saved_listings')
    .select('listing_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  let savedListings: Listing[] = [];
  if (savedError) {
    console.error('Failed to load saved listings:', savedError);
  } else {
    const ids = (savedRows ?? []).map((row) => row.listing_id);
    if (ids.length) {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          county,
          town,
          price_per_night,
          max_guests,
          bedrooms,
          amenities,
          average_rating,
          review_count,
          listing_images ( url, sort_order )
        `)
        .in('id', ids)
        .eq('status', 'published');

      if (error) {
        console.error('Failed to load saved listing details:', error);
      } else {
        const byId = new Map((data ?? []).map((listing) => [String(listing.id), listing]));
        savedListings = ids.flatMap((id) => {
          const listing = byId.get(id);
          if (!listing) return [];
          const images = Array.isArray(listing.listing_images)
            ? [...listing.listing_images].sort((first, second) => first.sort_order - second.sort_order)
            : [];
          const amenities = Array.isArray(listing.amenities)
            ? listing.amenities.filter((amenity): amenity is string => typeof amenity === 'string')
            : [];

          return [{
            id: String(listing.id),
            title: listing.title ?? 'Untitled stay',
            location: [listing.town, listing.county].filter(Boolean).join(', '),
            pricePerNight: Number(listing.price_per_night ?? 0),
            bedrooms: Number(listing.bedrooms ?? 0),
            guests: Number(listing.max_guests ?? 0),
            amenities,
            description: '',
            rating: Number(listing.average_rating ?? 0),
            reviewCount: Number(listing.review_count ?? 0),
            verified: true,
            imageUrl: images[0]?.url ?? '',
          } satisfies Listing];
        });
      }
    }
  }

  return (
    <section>
      <header className="mb-6">
        <h1 className="font-serif text-3xl text-neutral-900">Saved stays</h1>
        <p className="mt-2 text-sm text-neutral-600">Places you’ve kept for a future trip.</p>
      </header>
      <SavedListings listings={savedListings} loadError={Boolean(savedError)} />
    </section>
  );
}