alter table public.reviews
  add column if not exists moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'published', 'hidden'));

update public.reviews
   set moderation_status = 'published'
 where moderation_status = 'pending';

alter table public.reviews enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
      from pg_policies
     where schemaname = 'public'
       and tablename = 'reviews'
  loop
    execute format('drop policy %I on public.reviews', existing_policy.policyname);
  end loop;
end;
$$;

create policy "Published reviews and own submissions are visible"
  on public.reviews for select
  to anon, authenticated
  using (
    moderation_status = 'published'
    or guest_id = (select auth.uid())
  );

create policy "Guests can review eligible completed stays"
  on public.reviews for insert
  to authenticated
  with check (
    guest_id = (select auth.uid())
    and moderation_status = 'pending'
    and exists (
      select 1
        from public.bookings b
       where b.id = reviews.booking_id
         and b.listing_id = reviews.listing_id
         and b.guest_id = (select auth.uid())
         and b.status in ('confirmed', 'completed')
         and b.check_out <= current_date
    )
  );

grant select on public.reviews to anon, authenticated;
grant insert on public.reviews to authenticated;
revoke update, delete on public.reviews from anon, authenticated;

create index if not exists reviews_moderation_created_idx
  on public.reviews (moderation_status, created_at desc);

create or replace function public.sync_listing_review_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_listing_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_listing_id := old.listing_id;
  else
    affected_listing_id := new.listing_id;
  end if;

  update public.listings l
     set average_rating = coalesce(summary.average_rating, 0),
         review_count = coalesce(summary.review_count, 0)
    from (
      select avg(r.rating)::numeric as average_rating, count(*)::integer as review_count
        from public.reviews r
       where r.listing_id = affected_listing_id
         and r.moderation_status = 'published'
    ) summary
   where l.id = affected_listing_id;

  if tg_op = 'UPDATE' and old.listing_id is distinct from new.listing_id then
    update public.listings l
       set average_rating = coalesce(summary.average_rating, 0),
           review_count = coalesce(summary.review_count, 0)
      from (
        select avg(r.rating)::numeric as average_rating, count(*)::integer as review_count
          from public.reviews r
         where r.listing_id = old.listing_id
           and r.moderation_status = 'published'
      ) summary
     where l.id = old.listing_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_listing_review_summary() from public, anon, authenticated;

drop trigger if exists zzzz_sync_listing_review_summary on public.reviews;
create trigger zzzz_sync_listing_review_summary
  after insert or update of listing_id, rating, moderation_status or delete
  on public.reviews
  for each row execute function public.sync_listing_review_summary();

update public.listings l
   set average_rating = coalesce(summary.average_rating, 0),
       review_count = coalesce(summary.review_count, 0)
  from (
    select listing_id, avg(rating)::numeric as average_rating, count(*)::integer as review_count
      from public.reviews
     where moderation_status = 'published'
     group by listing_id
  ) summary
 where l.id = summary.listing_id;

update public.listings l
   set average_rating = 0,
       review_count = 0
 where not exists (
   select 1 from public.reviews r
    where r.listing_id = l.id
      and r.moderation_status = 'published'
 );

create table if not exists public.host_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  guest_id uuid not null references auth.users(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 2000),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  constraint host_reviews_not_self_review check (guest_id <> host_id)
);

create index if not exists host_reviews_host_status_created_idx
  on public.host_reviews (host_id, moderation_status, created_at desc);

create index if not exists host_reviews_moderation_created_idx
  on public.host_reviews (moderation_status, created_at desc);

alter table public.host_reviews enable row level security;

create policy "Users can read published host reviews or their own reviews"
  on public.host_reviews for select
  to authenticated
  using (
    moderation_status = 'published'
    or guest_id = (select auth.uid())
    or host_id = (select auth.uid())
  );

create policy "Guests can review eligible completed stays"
  on public.host_reviews for insert
  to authenticated
  with check (
    guest_id = (select auth.uid())
    and moderation_status = 'pending'
    and exists (
      select 1
        from public.bookings b
       where b.id = host_reviews.booking_id
         and b.guest_id = (select auth.uid())
         and b.host_id = host_reviews.host_id
         and b.status in ('confirmed', 'completed')
         and b.check_out <= current_date
    )
  );

grant select, insert on public.host_reviews to authenticated;

comment on table public.host_reviews is
  'Booking-verified guest feedback about a host, subject to admin moderation.';