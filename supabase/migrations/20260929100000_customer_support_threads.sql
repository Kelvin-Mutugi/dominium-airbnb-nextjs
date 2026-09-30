create table if not exists public.customer_support_threads (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  requester_role text not null check (requester_role in ('guest', 'host')),
  status text not null default 'waiting_on_admin'
    check (status in ('waiting_on_admin', 'waiting_on_requester', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  requester_last_read_at timestamptz not null default now(),
  admin_last_read_at timestamptz,
  unique (booking_id, requester_id)
);

create index if not exists customer_support_threads_status_updated_idx
  on public.customer_support_threads (status, updated_at desc);
create index if not exists customer_support_threads_requester_updated_idx
  on public.customer_support_threads (requester_id, updated_at desc);

create table if not exists public.customer_support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.customer_support_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('guest', 'host', 'admin')),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists customer_support_messages_thread_created_idx
  on public.customer_support_messages (thread_id, created_at);

insert into public.customer_support_threads (
  booking_id,
  requester_id,
  requester_role,
  status,
  created_at,
  updated_at,
  requester_last_read_at
)
select b.id,
       participant.user_id,
       participant.requester_role,
       'waiting_on_admin',
       min(message.created_at),
       max(message.created_at),
       now()
  from public.bookings b
  cross join lateral (
    values (b.guest_id, 'guest'::text), (b.host_id, 'host'::text)
  ) as participant(user_id, requester_role)
  join public.booking_messages message on message.booking_id = b.id
 where participant.user_id is not null
 group by b.id, participant.user_id, participant.requester_role
on conflict (booking_id, requester_id) do nothing;

alter table public.customer_support_threads enable row level security;
alter table public.customer_support_messages enable row level security;
revoke all on public.customer_support_threads from anon, authenticated;
revoke all on public.customer_support_messages from anon, authenticated;

drop policy if exists "Booking participants can read trip messages" on public.booking_messages;
drop policy if exists "Booking participants can send trip messages" on public.booking_messages;
revoke all on public.booking_messages from anon, authenticated;

drop policy if exists "Users can read their own trip thread receipts" on public.booking_thread_reads;
drop policy if exists "Booking participants can write their own trip thread receipts" on public.booking_thread_reads;
drop policy if exists "Users can update their own trip thread receipts" on public.booking_thread_reads;
revoke all on public.booking_thread_reads from anon, authenticated;

drop trigger if exists notify_booking_message_after_insert on public.booking_messages;

create or replace function public.notify_customer_support_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_row record;
begin
  select t.id, t.booking_id, t.requester_id
    into thread_row
    from public.customer_support_threads t
   where t.id = new.thread_id;
  if not found then return new; end if;

  if new.sender_role = 'admin' then
    insert into public.user_notifications (recipient_id, booking_id, category, title, body)
    values (
      thread_row.requester_id,
      thread_row.booking_id,
      'message',
      'Customer support replied',
      left(new.body, 500)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.notify_customer_support_reply() from public, anon, authenticated;
drop trigger if exists notify_customer_support_reply_after_insert on public.customer_support_messages;
create trigger notify_customer_support_reply_after_insert
  after insert on public.customer_support_messages
  for each row execute function public.notify_customer_support_reply();

comment on table public.customer_support_threads is
  'Private booking-linked support conversation owned by one guest or host requester and visible to admins; booking participants have separate threads.';
comment on table public.customer_support_messages is
  'Messages between one booking participant and the admin support team; never shared with the other booking participant.';
comment on table public.booking_messages is
  'Legacy guest-host messages retained for audit/history; participant access is revoked in favor of customer_support_threads.';