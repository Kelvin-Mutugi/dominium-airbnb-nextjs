alter table public.profiles
  add column if not exists kyc_reviewed_at timestamptz,
  add column if not exists kyc_reviewed_by uuid references auth.users(id),
  add column if not exists kyc_rejection_reason text;

comment on column public.profiles.kyc_reviewed_at is
  'Most recent time an administrator reviewed this host verification submission.';

comment on column public.profiles.kyc_reviewed_by is
  'Administrator who made the most recent host verification decision.';

comment on column public.profiles.kyc_rejection_reason is
  'Actionable reason shown to the host when verification is rejected.';