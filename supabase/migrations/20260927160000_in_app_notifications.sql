create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  category text not null check (category in ('message', 'booking', 'payment', 'change_request')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists user_notifications_recipient_unread_idx
  on public.user_notifications (recipient_id, created_at desc)
  where read_at is null;
create index if not exists user_notifications_recipient_created_idx
  on public.user_notifications (recipient_id, created_at desc);

alter table public.user_notifications enable row level security;
revoke all on public.user_notifications from anon, authenticated;
grant select on public.user_notifications to authenticated;
grant update (read_at) on public.user_notifications to authenticated;

drop policy if exists "Users can read their own notifications" on public.user_notifications;
create policy "Users can read their own notifications"
  on public.user_notifications for select
  to authenticated
  using (recipient_id = (select auth.uid()));

drop policy if exists "Users can mark their own notifications read" on public.user_notifications;
create policy "Users can mark their own notifications read"
  on public.user_notifications for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create or replace function public.notify_booking_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row record;
  recipient uuid;
begin
  select b.id, b.guest_id, b.host_id, b.listing_id
    into booking_row
    from public.bookings b
   where b.id = new.booking_id;
  if not found then return new; end if;

  if new.sender_id = booking_row.guest_id then
    recipient := booking_row.host_id;
  elsif new.sender_id = booking_row.host_id then
    recipient := booking_row.guest_id;
  else
    return new;
  end if;
  if recipient is null then return new; end if;

  insert into public.user_notifications (recipient_id, booking_id, category, title, body)
  select recipient, new.booking_id, 'message', 'New trip message',
         left(coalesce(nullif(trim(new.body), ''), 'Open the trip thread to read the message.'), 500);
  return new;
end;
$$;

create or replace function public.notify_booking_update_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row record;
  notification_category text;
begin
  if new.event_type not in (
    'booking_status_changed', 'booking_dates_changed', 'payment_status_changed',
    'cancellation_requested', 'cancellation_approved', 'date_change_requested',
    'date_change_approved', 'request_declined'
  ) then
    return new;
  end if;

  select b.guest_id, b.host_id
    into booking_row
    from public.bookings b
   where b.id = new.booking_id;
  if not found then return new; end if;

  notification_category := case
    when new.event_type = 'payment_status_changed' then 'payment'
    when new.event_type in ('cancellation_requested', 'cancellation_approved', 'date_change_requested', 'date_change_approved', 'request_declined') then 'change_request'
    else 'booking'
  end;

  insert into public.user_notifications (recipient_id, booking_id, category, title, body)
  select participant.user_id,
         new.booking_id,
         notification_category,
         case notification_category
           when 'payment' then 'Payment update'
           when 'change_request' then 'Booking request update'
           else 'Trip update'
         end,
         left(new.summary, 500)
    from (
      select booking_row.guest_id as user_id
       where booking_row.guest_id is not null
         and new.event_type <> 'payment_status_changed'
         and booking_row.guest_id is distinct from coalesce(new.actor_id, auth.uid())
      union all
      select booking_row.host_id as user_id
       where booking_row.host_id is not null
         and new.event_type <> 'payment_status_changed'
         and booking_row.host_id is distinct from coalesce(new.actor_id, auth.uid())
      union all
      select booking_row.guest_id as user_id
       where booking_row.guest_id is not null
         and new.event_type = 'payment_status_changed'
    ) participant;
  return new;
end;
$$;

revoke all on function public.notify_booking_message_recipient() from public, anon, authenticated;
revoke all on function public.notify_booking_update_participants() from public, anon, authenticated;

drop trigger if exists notify_booking_message_after_insert on public.booking_messages;
create trigger notify_booking_message_after_insert
  after insert on public.booking_messages
  for each row execute function public.notify_booking_message_recipient();

drop trigger if exists notify_booking_update_after_insert on public.booking_updates;
create trigger notify_booking_update_after_insert
  after insert on public.booking_updates
  for each row execute function public.notify_booking_update_participants();

comment on table public.user_notifications is
  'In-app notifications for booking messages, payment status, and trip decisions. Email/SMS delivery is not configured.';