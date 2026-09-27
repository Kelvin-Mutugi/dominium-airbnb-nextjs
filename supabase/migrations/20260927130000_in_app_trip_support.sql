create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists booking_messages_booking_created_idx
  on public.booking_messages (booking_id, created_at);

alter table public.booking_messages enable row level security;
revoke all on public.booking_messages from anon, authenticated;
grant select, insert on public.booking_messages to authenticated;

create policy "Booking participants can read trip messages"
  on public.booking_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
       where b.id = booking_messages.booking_id
         and (b.guest_id = (select auth.uid()) or b.host_id = (select auth.uid()))
    )
  );

create policy "Booking participants can send trip messages"
  on public.booking_messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
       where b.id = booking_messages.booking_id
         and (b.guest_id = (select auth.uid()) or b.host_id = (select auth.uid()))
    )
  );

create table if not exists public.booking_updates (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'booking_created', 'booking_status_changed', 'booking_dates_changed',
    'payment_status_changed', 'cancellation_requested', 'cancellation_approved',
    'date_change_requested', 'date_change_approved', 'request_declined'
  )),
  summary text not null check (char_length(summary) between 1 and 500),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_updates_booking_created_idx
  on public.booking_updates (booking_id, created_at desc);

alter table public.booking_updates enable row level security;
revoke all on public.booking_updates from anon, authenticated;
grant select on public.booking_updates to authenticated;

create policy "Booking participants can read trip updates"
  on public.booking_updates for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
       where b.id = booking_updates.booking_id
         and (b.guest_id = (select auth.uid()) or b.host_id = (select auth.uid()))
    )
  );

create or replace function public.record_booking_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_updates (booking_id, event_type, summary, details)
    values (
      new.id,
      'booking_created',
      'Booking created',
      jsonb_build_object('check_in', new.check_in, 'check_out', new.check_out, 'status', new.status)
    );
    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.booking_updates (booking_id, event_type, summary, details)
    values (
      new.id,
      'booking_status_changed',
      format('Booking status changed from %s to %s', old.status, new.status),
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;

  if old.check_in is distinct from new.check_in or old.check_out is distinct from new.check_out then
    insert into public.booking_updates (booking_id, event_type, summary, details)
    values (
      new.id,
      'booking_dates_changed',
      'Booking dates updated',
      jsonb_build_object(
        'old_check_in', old.check_in,
        'old_check_out', old.check_out,
        'new_check_in', new.check_in,
        'new_check_out', new.check_out
      )
    );
  end if;
  return new;
end;
$$;

create or replace function public.record_payment_status_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.booking_updates (booking_id, event_type, summary, details)
    values (
      new.booking_id,
      'payment_status_changed',
      format('Payment status changed from %s to %s', old.status, new.status),
      jsonb_build_object('old_status', old.status, 'new_status', new.status, 'amount', new.amount)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.record_booking_update() from public, anon, authenticated;
revoke all on function public.record_payment_status_update() from public, anon, authenticated;

drop trigger if exists record_booking_update_after_write on public.bookings;
create trigger record_booking_update_after_write
  after insert or update of status, check_in, check_out on public.bookings
  for each row execute function public.record_booking_update();

drop trigger if exists record_payment_status_update_after_write on public.payments;
create trigger record_payment_status_update_after_write
  after update of status on public.payments
  for each row execute function public.record_payment_status_update();

insert into public.booking_updates (booking_id, event_type, summary, details, created_at)
select b.id,
       'booking_created',
       'Booking created',
       jsonb_build_object('check_in', b.check_in, 'check_out', b.check_out, 'status', b.status),
       b.created_at
  from public.bookings b
 where not exists (
   select 1 from public.booking_updates u
    where u.booking_id = b.id and u.event_type = 'booking_created'
 );

comment on table public.booking_messages is
  'Private guest-host messages scoped to a booking and visible only to booking participants.';
comment on table public.booking_updates is
  'Append-only booking event history for important status, date, and payment updates.';