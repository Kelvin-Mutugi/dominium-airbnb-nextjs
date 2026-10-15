create table if not exists public.chart_of_accounts (
  code text primary key,
  name text not null,
  account_type text not null check (account_type in ('asset', 'liability', 'expense', 'revenue')),
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source_type text not null,
  source_ref text not null,
  booking_id uuid null,
  payment_id uuid null,
  payout_id uuid null,
  host_id uuid null,
  currency text not null default 'KES' check (currency = 'KES'),
  idempotency_key text not null unique,
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'posted', 'reversed', 'rejected')),
  created_at timestamptz not null default now(),
  posted_at timestamptz null,
  reversal_of uuid null references public.financial_transactions(id),
  check (status <> 'posted' or posted_at is not null)
);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.financial_transactions(id) on delete restrict,
  account_code text not null references public.chart_of_accounts(code),
  booking_id uuid null,
  payment_id uuid null,
  payout_id uuid null,
  host_id uuid null,
  currency text not null default 'KES' check (currency = 'KES'),
  debit_amount numeric(18,2) not null default 0 check (debit_amount >= 0),
  credit_amount numeric(18,2) not null default 0 check (credit_amount >= 0),
  created_at timestamptz not null default now(),
  unique (transaction_id, account_code),
  check (debit_amount > 0 or credit_amount > 0),
  check (debit_amount = 0 or credit_amount = 0)
);

create index if not exists financial_transactions_booking_idx
  on public.financial_transactions (booking_id, created_at desc);
create index if not exists financial_transactions_source_idx
  on public.financial_transactions (source_type, source_ref);
create index if not exists financial_entries_account_idx
  on public.financial_entries (account_code, created_at desc);

insert into public.chart_of_accounts (code, name, account_type, description)
values
  ('1100_M_PESA_CLEARING', 'M-PESA clearing and cash held', 'asset', 'Cash collected from guest payments but not yet settled or transferred to hosts.'),
  ('1200_SETTLEMENT_ACCOUNT', 'Operating settlement account', 'asset', 'Bank or settlement account holding cleared funds.'),
  ('2100_HOST_PAYABLES', 'Host payable liabilities', 'liability', 'Amounts due to hosts after accommodation delivery and approval.'),
  ('2200_DEFERRED_PLATFORM_REVENUE', 'Deferred platform revenue', 'liability', 'Platform markup held until the booking is fulfilled or refunded.'),
  ('3100_GUEST_REFUND_PAYABLE', 'Guest refund payable', 'liability', 'Refunds and reversal obligations owed to guests.'),
  ('4100_PAYMENT_PROCESSING_EXPENSE', 'Payment processing expense', 'expense', 'M-PESA and other gateway processing fees.'),
  ('5000_PLATFORM_REVENUE', 'Recognized platform revenue', 'revenue', 'Revenue recognized after service delivery or legal settlement.'),
  ('5200_REFUND_AND_DISPUTE_LOSS', 'Refunds and unrecoverable losses', 'expense', 'Refunds, disputes and unrecoverable payment losses.'),
  ('6100_HOST_PAYOUT_LIABILITIES', 'Host payout disbursement liabilities', 'liability', 'Pending B2C transfer requests before provider confirmation.'),
  ('7000_TAX_LIABILITY', 'Tax liability', 'liability', 'Tax due or collected when required by law and accounting policy.')
on conflict (code) do nothing;

create or replace function public.validate_balanced_financial_transaction(p_entries jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_debit_total numeric := 0;
  v_credit_total numeric := 0;
  v_entry jsonb;
begin
  if jsonb_typeof(p_entries) <> 'array' then
    raise exception 'FINANCIAL_ENTRIES_MUST_BE_ARRAY';
  end if;

  for v_entry in select value from jsonb_array_elements(p_entries)
  loop
    if not exists (select 1 from public.chart_of_accounts where code = v_entry->>'account_code') then
      raise exception 'UNSUPPORTED_ACCOUNT_REFERENCE: %', coalesce(v_entry->>'account_code', 'UNKNOWN');
    end if;

    if coalesce((v_entry->>'debit_amount')::numeric, 0) > 0 and coalesce((v_entry->>'credit_amount')::numeric, 0) > 0 then
      raise exception 'LEDGER_ENTRY_CANNOT_BE_DEBIT_AND_CREDIT';
    end if;

    v_debit_total := v_debit_total + coalesce((v_entry->>'debit_amount')::numeric, 0);
    v_credit_total := v_credit_total + coalesce((v_entry->>'credit_amount')::numeric, 0);
  end loop;

  return round(v_debit_total, 2) = round(v_credit_total, 2);
end;
$$;

create or replace function public.post_financial_transaction(
  p_event_type text,
  p_source_type text,
  p_source_ref text,
  p_booking_id uuid default null,
  p_payment_id uuid default null,
  p_payout_id uuid default null,
  p_host_id uuid default null,
  p_currency text default 'KES',
  p_idempotency_key text default null,
  p_description text default '',
  p_metadata jsonb default '{}'::jsonb,
  p_entries jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
  v_entry jsonb;
begin
  if p_idempotency_key is null or trim(p_idempotency_key) = '' then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  if p_currency <> 'KES' then
    raise exception 'UNSUPPORTED_CURRENCY';
  end if;

  if exists (select 1 from public.financial_transactions where idempotency_key = p_idempotency_key) then
    select id into v_transaction_id
    from public.financial_transactions
    where idempotency_key = p_idempotency_key
    limit 1;
    return v_transaction_id;
  end if;

  if not public.validate_balanced_financial_transaction(p_entries) then
    raise exception 'UNBALANCED_LEDGER_TRANSACTION';
  end if;

  insert into public.financial_transactions (
    event_type, source_type, source_ref, booking_id, payment_id, payout_id, host_id,
    currency, idempotency_key, description, metadata, status, posted_at
  ) values (
    p_event_type, p_source_type, p_source_ref, p_booking_id, p_payment_id, p_payout_id, p_host_id,
    p_currency, p_idempotency_key, p_description, coalesce(p_metadata, '{}'::jsonb), 'posted', now()
  ) returning id into v_transaction_id;

  for v_entry in select value from jsonb_array_elements(p_entries)
  loop
    insert into public.financial_entries (
      transaction_id,
      account_code,
      booking_id,
      payment_id,
      payout_id,
      host_id,
      currency,
      debit_amount,
      credit_amount
    ) values (
      v_transaction_id,
      v_entry->>'account_code',
      p_booking_id,
      p_payment_id,
      p_payout_id,
      p_host_id,
      p_currency,
      coalesce((v_entry->>'debit_amount')::numeric, 0),
      coalesce((v_entry->>'credit_amount')::numeric, 0)
    );
  end loop;

  return v_transaction_id;
end;
$$;

create or replace function public.prevent_posted_transaction_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'posted' then
    raise exception 'POSTED_FINANCIAL_RECORDS_ARE_IMMUTABLE';
  end if;
  return old;
end;
$$;

create or replace function public.prevent_posted_entry_mutation()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.financial_transactions t
    where t.id = old.transaction_id and t.status = 'posted'
  ) then
    raise exception 'POSTED_FINANCIAL_RECORDS_ARE_IMMUTABLE';
  end if;
  return old;
end;
$$;

create trigger financial_transactions_prevent_delete
before delete on public.financial_transactions
for each row execute function public.prevent_posted_transaction_mutation();

create trigger financial_transactions_prevent_update
before update on public.financial_transactions
for each row execute function public.prevent_posted_transaction_mutation();

create trigger financial_entries_prevent_delete
before delete on public.financial_entries
for each row execute function public.prevent_posted_entry_mutation();

create trigger financial_entries_prevent_update
before update on public.financial_entries
for each row execute function public.prevent_posted_entry_mutation();

alter table public.chart_of_accounts enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.financial_entries enable row level security;

create policy "chart_of_accounts_service_role_only"
  on public.chart_of_accounts
  as permissive
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "financial_transactions_service_role_only"
  on public.financial_transactions
  as permissive
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "financial_entries_service_role_only"
  on public.financial_entries
  as permissive
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

revoke all on public.chart_of_accounts from public, anon, authenticated;
revoke all on public.financial_transactions from public, anon, authenticated;
revoke all on public.financial_entries from public, anon, authenticated;

grant select on public.chart_of_accounts to service_role;
grant select on public.financial_transactions to service_role;
grant select on public.financial_entries to service_role;
grant insert, update, delete on public.chart_of_accounts to service_role;
grant insert, update, delete on public.financial_transactions to service_role;
grant insert, update, delete on public.financial_entries to service_role;

revoke all on function public.validate_balanced_financial_transaction(jsonb) from public, anon, authenticated;
revoke all on function public.post_financial_transaction(text, text, text, uuid, uuid, uuid, uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;

grant execute on function public.validate_balanced_financial_transaction(jsonb) to service_role;
grant execute on function public.post_financial_transaction(text, text, text, uuid, uuid, uuid, uuid, text, text, text, jsonb, jsonb) to service_role;
