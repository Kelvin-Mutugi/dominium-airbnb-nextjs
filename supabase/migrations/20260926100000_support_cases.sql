create table if not exists public.support_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  category text not null check (
    category in ('booking_issue', 'payment_refund', 'host_guest_concern', 'listing_issue', 'account', 'other')
  ),
  subject text not null check (char_length(subject) between 5 and 120),
  message text not null check (char_length(message) between 20 and 5000),
  status text not null default 'new' check (
    status in ('new', 'in_review', 'waiting_on_user', 'resolved', 'closed')
  ),
  public_reply text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_cases_user_created_idx
  on public.support_cases (user_id, created_at desc);

create index if not exists support_cases_status_created_idx
  on public.support_cases (status, created_at desc);

alter table public.support_cases enable row level security;

create policy "Users can view their own support cases"
  on public.support_cases for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can submit support cases for themselves"
  on public.support_cases for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      booking_id is null
      or exists (
        select 1
        from public.bookings b
        where b.id = support_cases.booking_id
          and (b.guest_id = (select auth.uid()) or b.host_id = (select auth.uid()))
      )
    )
  );

grant select, insert on public.support_cases to authenticated;

comment on table public.support_cases is
  'Guest and host support requests, disputes, and refund inquiries.';