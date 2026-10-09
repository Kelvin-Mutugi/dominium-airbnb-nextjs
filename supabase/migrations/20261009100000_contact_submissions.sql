create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) <= 40),
  county text check (county is null or char_length(county) <= 80),
  topic text not null check (topic in (
    'Booking help',
    'List my property',
    'Payment issue',
    'Feedback',
    'Something else'
  )),
  message text not null check (char_length(trim(message)) between 10 and 800),
  status text not null default 'new' check (status in ('new', 'in_review', 'resolved', 'closed')),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists contact_submissions_status_created_idx
  on public.contact_submissions (status, created_at desc);

alter table public.contact_submissions enable row level security;
revoke all on public.contact_submissions from public, anon, authenticated;
grant all privileges on public.contact_submissions to service_role;

comment on table public.contact_submissions is
  'Public contact form submissions. Access is restricted to server-side service-role operations.';
