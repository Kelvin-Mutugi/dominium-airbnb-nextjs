create table if not exists public.support_case_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('requester', 'support')),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists support_case_messages_case_created_idx
  on public.support_case_messages (case_id, created_at);

alter table public.support_case_messages enable row level security;

drop policy if exists "Requesters can view messages on their support cases"
  on public.support_case_messages;
create policy "Requesters can view messages on their support cases"
  on public.support_case_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.support_cases c
      where c.id = support_case_messages.case_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Requesters can reply to their support cases"
  on public.support_case_messages;
create policy "Requesters can reply to their support cases"
  on public.support_case_messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and sender_role = 'requester'
    and exists (
      select 1
      from public.support_cases c
      where c.id = support_case_messages.case_id
        and c.user_id = (select auth.uid())
    )
  );

grant select, insert on public.support_case_messages to authenticated;

insert into public.support_case_messages (case_id, sender_role, body, created_at)
select c.id, 'support', c.public_reply, c.updated_at
from public.support_cases c
where nullif(btrim(c.public_reply), '') is not null
  and not exists (
    select 1
    from public.support_case_messages m
    where m.case_id = c.id
      and m.sender_role = 'support'
      and m.body = c.public_reply
  );