create table if not exists public.sale_properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(trim(title)) between 5 and 140),
  description text not null check (char_length(trim(description)) between 30 and 5000),
  property_type text not null check (
    property_type in ('apartment', 'unit', 'house', 'land', 'commercial')
  ),
  asking_price numeric(14, 2) not null check (asking_price > 0),
  county text not null check (char_length(trim(county)) between 2 and 80),
  town text not null check (char_length(trim(town)) between 2 and 100),
  neighborhood text check (
    neighborhood is null or char_length(trim(neighborhood)) <= 120
  ),
  bedrooms smallint not null default 0 check (bedrooms between 0 and 50),
  bathrooms smallint not null default 0 check (bathrooms between 0 and 50),
  size_sqm numeric(10, 2) check (size_sqm is null or size_sqm > 0),
  parking_spaces smallint not null default 0 check (parking_spaces between 0 and 50),
  amenities text[] not null default '{}',
  owner_name text not null check (char_length(trim(owner_name)) between 2 and 120),
  owner_email text check (owner_email is null or char_length(owner_email) <= 254),
  owner_phone text check (owner_phone is null or char_length(owner_phone) <= 40),
  status text not null default 'draft' check (
    status in ('draft', 'published', 'sold', 'withdrawn')
  ),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_email is not null or owner_phone is not null)
);

create table if not exists public.sale_property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.sale_properties(id) on delete cascade,
  storage_path text not null unique,
  position smallint not null check (position between 0 and 14),
  is_cover boolean not null default false,
  alt_text text not null default '' check (char_length(alt_text) <= 160),
  width smallint not null check (width between 1 and 2400),
  height smallint not null check (height between 1 and 2400),
  created_at timestamptz not null default now(),
  unique (property_id, position)
);

create unique index if not exists sale_property_images_one_cover_idx
  on public.sale_property_images (property_id)
  where is_cover;

create index if not exists sale_properties_published_created_idx
  on public.sale_properties (created_at desc, id desc)
  where status = 'published';

create index if not exists sale_properties_published_price_idx
  on public.sale_properties (asking_price, id)
  where status = 'published';

create index if not exists sale_properties_published_location_idx
  on public.sale_properties (county, created_at desc, id desc)
  where status = 'published';

create index if not exists sale_properties_admin_updated_idx
  on public.sale_properties (updated_at desc, id desc);

create index if not exists sale_properties_admin_status_updated_idx
  on public.sale_properties (status, updated_at desc, id desc);

create index if not exists sale_property_images_property_position_idx
  on public.sale_property_images (property_id, position);

alter table public.sale_properties enable row level security;
alter table public.sale_property_images enable row level security;

revoke all on public.sale_properties, public.sale_property_images
  from public, anon, authenticated;
grant all privileges on public.sale_properties, public.sale_property_images
  to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sale-property-images',
  'sale-property-images',
  true,
  10485760,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read sale property images" on storage.objects;
create policy "Public can read sale property images"
  on storage.objects for select to public
  using (bucket_id = 'sale-property-images');

drop policy if exists "Clients cannot write sale property images" on storage.objects;
create policy "Clients cannot write sale property images"
  on storage.objects as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'sale-property-images');

drop policy if exists "Clients cannot update sale property images" on storage.objects;
create policy "Clients cannot update sale property images"
  on storage.objects as restrictive for update to anon, authenticated
  using (bucket_id <> 'sale-property-images')
  with check (bucket_id <> 'sale-property-images');

drop policy if exists "Clients cannot delete sale property images" on storage.objects;
create policy "Clients cannot delete sale property images"
  on storage.objects as restrictive for delete to anon, authenticated
  using (bucket_id <> 'sale-property-images');

comment on table public.sale_properties is
  'Admin-managed homes and units offered for sale; intentionally separate from BnB listings.';
comment on column public.sale_properties.owner_name is
  'Private seller contact information. Never include in public property queries.';
