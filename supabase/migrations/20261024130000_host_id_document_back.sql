alter table public.profiles
  add column if not exists id_document_back_url text;

comment on column public.profiles.id_document_back_url is
  'Private storage path for the back of a host national ID document.';
