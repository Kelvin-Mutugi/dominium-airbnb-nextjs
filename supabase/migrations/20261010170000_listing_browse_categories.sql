alter table public.listings
  add column if not exists categories text[] not null default '{}';

alter table public.listings
  drop constraint if exists listings_categories_check,
  add constraint listings_categories_check
    check (
      categories <@ array[
        'apartments', 'beachfront', 'villas', 'cabins', 'city', 'pet-friendly'
      ]::text[]
    );