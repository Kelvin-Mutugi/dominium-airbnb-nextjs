create or replace function public.prevent_host_identity_data_changes()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  old_values jsonb;
  new_values jsonb;
  column_name text;
begin
  if tg_op = 'INSERT' then
    new := jsonb_populate_record(new, jsonb_build_object(
      'id_number', null,
      'id_document_type', null,
      'id_document_url', null,
      'id_document_back_url', null
    ));
    return new;
  end if;

  old_values := to_jsonb(old);
  new_values := to_jsonb(new);

  foreach column_name in array array[
    'id_number',
    'id_document_type',
    'id_document_url',
    'id_document_back_url'
  ]
  loop
    if (old_values -> column_name) is distinct from (new_values -> column_name) then
      raise exception 'Previously saved host identity document details cannot be changed.';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_host_identity_data_changes on public.profiles;
create trigger profiles_prevent_host_identity_data_changes
before insert or update on public.profiles
for each row execute function public.prevent_host_identity_data_changes();

do $$
declare
  upload_policy record;
begin
  for upload_policy in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'ALL')
      and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ilike '%host-documents%'
  loop
    execute format('drop policy %I on storage.objects', upload_policy.policyname);
  end loop;
end;
$$;
