create table if not exists public.sale_shortlists (
  id uuid primary key default gen_random_uuid(),
  share_token text not null unique check (share_token ~ '^[A-Za-z0-9_-]{43}$'),
  owner_token_hash text not null unique check (owner_token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.sale_shortlist_items (
  shortlist_id uuid not null references public.sale_shortlists(id) on delete cascade,
  property_id uuid not null references public.sale_properties(id) on delete cascade,
  sort_order smallint not null check (sort_order between 0 and 19),
  created_at timestamptz not null default now(),
  primary key (shortlist_id, property_id),
  unique (shortlist_id, sort_order)
);

create index if not exists sale_shortlist_items_property_idx
  on public.sale_shortlist_items (property_id);

alter table public.sale_shortlists enable row level security;
alter table public.sale_shortlist_items enable row level security;

revoke all on public.sale_shortlists, public.sale_shortlist_items
  from public, anon, authenticated;
grant all privileges on public.sale_shortlists, public.sale_shortlist_items
  to service_role;

create or replace function public.sync_sale_shortlist(
  p_existing_owner_hash text,
  p_new_owner_hash text,
  p_new_share_token text,
  p_property_ids uuid[]
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_shortlist_id uuid;
  v_saved_share_token text;
  v_valid_property_count integer;
begin
  if p_property_ids is null
    or cardinality(p_property_ids) < 1
    or cardinality(p_property_ids) > 20
  then
    raise exception 'A shortlist must contain between 1 and 20 properties.';
  end if;

  select count(distinct property.id)
    into v_valid_property_count
  from unnest(p_property_ids) as requested(id)
  join public.sale_properties property
    on property.id = requested.id
   and property.status = 'published';

  if v_valid_property_count <> cardinality(p_property_ids) then
    raise exception 'Shortlist properties must be unique published listings.';
  end if;

  if p_existing_owner_hash is not null then
    select shortlist.id, shortlist.share_token
      into v_shortlist_id, v_saved_share_token
    from public.sale_shortlists shortlist
    where shortlist.owner_token_hash = p_existing_owner_hash
      and shortlist.revoked_at is null
    for update;

    if v_shortlist_id is null then
      raise exception 'Shortlist owner token is invalid or revoked.';
    end if;

    update public.sale_shortlists
       set updated_at = now()
       where id = v_shortlist_id;
  else
    if coalesce(p_new_owner_hash, '') !~ '^[a-f0-9]{64}$'
        or coalesce(p_new_share_token, '') !~ '^[A-Za-z0-9_-]{43}$'
    then
      raise exception 'Shortlist tokens are invalid.';
    end if;

    insert into public.sale_shortlists (owner_token_hash, share_token)
    values (p_new_owner_hash, p_new_share_token)
    returning sale_shortlists.id, sale_shortlists.share_token
      into v_shortlist_id, v_saved_share_token;
  end if;

  delete from public.sale_shortlist_items
  where sale_shortlist_items.shortlist_id = v_shortlist_id;

  insert into public.sale_shortlist_items (shortlist_id, property_id, sort_order)
  select v_shortlist_id, requested.id, (requested.ordinality - 1)::smallint
  from unnest(p_property_ids) with ordinality as requested(id, ordinality);

  return v_saved_share_token;
end;
$$;

revoke all on function public.sync_sale_shortlist(text, text, text, uuid[])
  from public, anon, authenticated;
grant execute on function public.sync_sale_shortlist(text, text, text, uuid[])
  to service_role;

create or replace function public.revoke_sale_shortlist(p_owner_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.sale_shortlists
     set revoked_at = now(),
         updated_at = now()
   where owner_token_hash = p_owner_hash
     and revoked_at is null;

  return found;
end;
$$;

revoke all on function public.revoke_sale_shortlist(text)
  from public, anon, authenticated;
grant execute on function public.revoke_sale_shortlist(text)
  to service_role;

comment on table public.sale_shortlists is
  'Token-protected anonymous sale shortlists. Access is mediated by server routes using the service role.';
comment on column public.sale_shortlists.owner_token_hash is
  'SHA-256 hash of a random owner capability token retained on the owner device; never store the raw token.';
