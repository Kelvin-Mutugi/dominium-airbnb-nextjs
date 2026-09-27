alter table public.reviews
  add column if not exists cleanliness_rating integer check (cleanliness_rating between 1 and 5),
  add column if not exists accuracy_rating integer check (accuracy_rating between 1 and 5),
  add column if not exists location_rating integer check (location_rating between 1 and 5),
  add column if not exists communication_rating integer check (communication_rating between 1 and 5);

update public.reviews
   set cleanliness_rating = coalesce(cleanliness_rating, rating),
       accuracy_rating = coalesce(accuracy_rating, rating),
       location_rating = coalesce(location_rating, rating),
       communication_rating = coalesce(communication_rating, rating);

alter table public.reviews
  alter column cleanliness_rating set not null,
  alter column accuracy_rating set not null,
  alter column location_rating set not null,
  alter column communication_rating set not null;

drop policy if exists "Guests can review eligible completed stays" on public.reviews;
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
         and b.status = 'completed'
         and b.check_out <= current_date
    )
  );

drop policy if exists "Guests can review eligible completed stays" on public.host_reviews;
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
         and b.status = 'completed'
         and b.check_out <= current_date
    )
  );