create table if not exists public.booking_thread_reads (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (booking_id, user_id)
);

alter table public.booking_thread_reads enable row level security;
revoke all on public.booking_thread_reads from anon, authenticated;
grant select, insert, update on public.booking_thread_reads to authenticated;

drop policy if exists "Users can read their own trip thread receipts" on public.booking_thread_reads;
create policy "Users can read their own trip thread receipts"
  on public.booking_thread_reads for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Booking participants can write their own trip thread receipts" on public.booking_thread_reads;
create policy "Booking participants can write their own trip thread receipts"
  on public.booking_thread_reads for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
       where b.id = booking_thread_reads.booking_id
         and (b.guest_id = (select auth.uid()) or b.host_id = (select auth.uid()))
    )
  );

drop policy if exists "Users can update their own trip thread receipts" on public.booking_thread_reads;
create policy "Users can update their own trip thread receipts"
  on public.booking_thread_reads for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
       where b.id = booking_thread_reads.booking_id
         and (b.guest_id = (select auth.uid()) or b.host_id = (select auth.uid()))
    )
  );

insert into public.booking_thread_reads (booking_id, user_id, last_read_at)
select b.id, participant.user_id, now()
  from public.bookings b
  cross join lateral (
    select b.guest_id as user_id
     where b.guest_id is not null
       and exists (select 1 from auth.users u where u.id = b.guest_id)
    union
    select b.host_id as user_id
     where b.host_id is not null
       and exists (select 1 from auth.users u where u.id = b.host_id)
  ) participant
on conflict (booking_id, user_id) do nothing;