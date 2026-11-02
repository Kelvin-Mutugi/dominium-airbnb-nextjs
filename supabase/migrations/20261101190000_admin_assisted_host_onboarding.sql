alter table public.profiles
  add column if not exists host_onboarding_source text
    check (host_onboarding_source in ('host', 'admin_assisted')),
  add column if not exists host_onboarding_submitted_by uuid
    references auth.users(id) on delete set null,
  add column if not exists host_terms_acceptance_source text
    check (host_terms_acceptance_source in ('host', 'admin_confirmed'));

comment on column public.profiles.host_onboarding_source is
  'Indicates whether the host submitted their onboarding details or an administrator entered them on their behalf.';

comment on column public.profiles.host_onboarding_submitted_by is
  'Administrator who entered the most recent admin-assisted host application.';

comment on column public.profiles.host_terms_acceptance_source is
  'Indicates whether host terms acceptance was submitted by the host or confirmed by an administrator on the host’s behalf.';
