alter table public.support_cases
  add column if not exists support_context text not null default 'account'
  check (support_context in ('account', 'host'));

comment on column public.support_cases.support_context is
  'Separates host-panel support requests from general account support requests.';
