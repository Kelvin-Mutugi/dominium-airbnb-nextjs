alter table public.profiles
  add column if not exists host_terms_accepted_at timestamptz,
  add column if not exists host_terms_version text;

comment on column public.profiles.host_terms_accepted_at is
  'Time at which the host accepted the listing agreement and terms of service.';

comment on column public.profiles.host_terms_version is
  'Version of the host listing agreement accepted by the host.';