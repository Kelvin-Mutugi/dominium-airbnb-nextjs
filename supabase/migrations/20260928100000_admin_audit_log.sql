create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  entity_type text not null check (entity_type in (
    'listing',
    'booking',
    'user',
    'host_verification',
    'support_case',
    'review'
  )),
  entity_id uuid not null,
  summary text not null check (char_length(summary) between 1 and 500),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_entity_idx
  on public.admin_audit_logs (entity_type, entity_id, created_at desc);

create index if not exists admin_audit_logs_actor_idx
  on public.admin_audit_logs (actor_id, created_at desc);

alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from public, anon, authenticated;
grant all on public.admin_audit_logs to service_role;