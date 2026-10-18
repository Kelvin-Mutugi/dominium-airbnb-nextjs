alter table public.host_payout_requests
  add column if not exists collection_fee_amount numeric(12, 2),
  add column if not exists collection_fee_recorded_by uuid references public.profiles(id) on delete set null,
  add column if not exists collection_fee_recorded_at timestamptz,
  add column if not exists collection_fee_note text;

alter table public.host_payout_requests
  drop constraint if exists host_payout_requests_collection_fee_amount_check;
alter table public.host_payout_requests
  add constraint host_payout_requests_collection_fee_amount_check
    check (collection_fee_amount is null or collection_fee_amount between 0 and 1000000000);

comment on column public.host_payout_requests.collection_fee_amount is
  'Aggregate Safaricom STK collection fee for unreconciled collections in this request, entered once by an admin during payout processing.';

comment on column public.bookings.collection_fee_reconciled is
  'Legacy per-booking STK fee reconciliation flag; false no longer blocks payout eligibility because aggregate fees are recorded on host payout requests.';

create or replace function public.create_host_payout_for_completed_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payout_status public.payout_status;
  payout_is_eligible boolean;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    payout_status := case when new.completion_source = 'system'
      then 'owed'::public.payout_status else 'processing'::public.payout_status end;
    payout_is_eligible := coalesce(
      jsonb_typeof(new.pricing_snapshot->'line_items') = 'array'
      and new.host_gross_amount > 0
      and exists (select 1 from public.payments p where p.booking_id = new.id and p.status = 'paid'),
      false
    );
    insert into public.payouts (booking_id, host_id, amount, status, eligible_for_withdrawal)
    select new.id, new.host_id, new.host_payout_amount, payout_status, payout_is_eligible
     where new.host_payout_amount > 0
       and not exists (select 1 from public.payouts p where p.booking_id = new.id);
  end if;
  return new;
end;
$$;

update public.payouts p
   set eligible_for_withdrawal = true
  from public.bookings b
 where b.id = p.booking_id
   and p.status = 'owed'
   and not p.eligible_for_withdrawal
   and jsonb_typeof(b.pricing_snapshot->'line_items') = 'array'
   and b.host_gross_amount > 0
   and exists (select 1 from public.payments payment where payment.booking_id = b.id and payment.status = 'paid');

create or replace function public.admin_prepare_daraja_host_payout_with_collection_fee(
  p_request_id uuid,
  p_admin_id uuid,
  p_estimated_fee numeric,
  p_collection_fee numeric,
  p_idempotency_key text,
  p_admin_note text default null
)
returns table (
  attempt_id uuid,
  host_id uuid,
  request_amount numeric,
  transfer_amount numeric,
  phone_number text,
  already_submitted boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row public.host_payout_requests%rowtype;
  profile_row public.profiles%rowtype;
  normalized_note text;
begin
  if not exists (select 1 from public.admin_roles where user_id = p_admin_id and privilege is true) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_collection_fee is null or p_collection_fee < 0 or p_collection_fee > 1000000000
     or round(p_collection_fee, 2) <> p_collection_fee then
    raise exception 'INVALID_COLLECTION_FEE';
  end if;

  normalized_note := nullif(left(trim(coalesce(p_admin_note, '')), 1000), '');

  select r.* into request_row
    from public.host_payout_requests r
   where r.id = p_request_id
   for update;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;
  if request_row.status <> 'processing' or request_row.processing_by is distinct from p_admin_id then
    raise exception 'PAYOUT_REQUEST_NOT_CLAIMED';
  end if;

  if request_row.collection_fee_amount is null then
    update public.profiles
       set host_fee_balance = coalesce(host_fee_balance, 0) + p_collection_fee
     where id = request_row.host_id
     returning * into profile_row;
    if not found then raise exception 'HOST_NOT_FOUND'; end if;

    update public.host_payout_requests
       set collection_fee_amount = p_collection_fee,
           collection_fee_recorded_by = p_admin_id,
           collection_fee_recorded_at = now(),
           collection_fee_note = normalized_note,
           updated_at = now()
     where id = request_row.id;

    if p_collection_fee > 0 then
      perform public.post_financial_transaction(
        'payment_processing_fee_reconciled', 'host_payout_request', request_row.id::text,
        null, null, null, request_row.host_id,
        'KES', 'daraja-collection-fee-request:' || request_row.id::text,
        'Aggregate Safaricom STK collection fee recorded during host payout processing',
        jsonb_build_object(
          'provider', 'safaricom',
          'fee_kind', 'collection',
          'admin_id', p_admin_id,
          'collection_fee_amount', p_collection_fee,
          'admin_note', normalized_note
        ),
        jsonb_build_array(
          jsonb_build_object('account_code', '4100_PAYMENT_PROCESSING_EXPENSE', 'debit_amount', p_collection_fee),
          jsonb_build_object('account_code', '1100_M_PESA_CLEARING', 'credit_amount', p_collection_fee)
        )
      );
    end if;
  elsif request_row.collection_fee_amount <> p_collection_fee then
    raise exception 'COLLECTION_FEE_ALREADY_RECORDED';
  end if;

  return query
    select prepared.attempt_id, prepared.host_id, prepared.request_amount,
      prepared.transfer_amount, prepared.phone_number, prepared.already_submitted
      from public.admin_prepare_daraja_host_payout(
        p_request_id, p_admin_id, p_estimated_fee, p_idempotency_key
      ) prepared;
end;
$$;
revoke all on function public.admin_prepare_daraja_host_payout_with_collection_fee(uuid, uuid, numeric, numeric, text, text) from public, anon, authenticated;
grant execute on function public.admin_prepare_daraja_host_payout_with_collection_fee(uuid, uuid, numeric, numeric, text, text) to service_role;
