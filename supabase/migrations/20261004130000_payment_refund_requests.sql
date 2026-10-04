create table if not exists public.payment_refund_requests (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  guest_id uuid references auth.users(id) on delete set null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  amount_paid numeric(12, 2) not null check (amount_paid > 0),
  reason text not null check (char_length(trim(reason)) between 5 and 1000),
  status text not null default 'awaiting_admin_review'
    check (status in ('awaiting_admin_review', 'awaiting_manual_processing', 'declined', 'processed')),
  admin_response text check (admin_response is null or char_length(admin_response) <= 1000),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  actual_refund_amount numeric(12, 2) check (actual_refund_amount is null or actual_refund_amount > 0),
  transaction_reference text check (transaction_reference is null or char_length(transaction_reference) <= 200),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_refund_requests_status_created_idx
  on public.payment_refund_requests (status, created_at desc);

create unique index if not exists payment_refund_requests_one_per_payment_idx
  on public.payment_refund_requests (payment_id);

alter table public.payment_refund_requests enable row level security;
revoke all on public.payment_refund_requests from public, anon, authenticated;

create or replace function public.admin_decide_payment_refund_request(
  p_request_id uuid,
  p_action text,
  p_admin_response text default null,
  p_actual_refund_amount numeric default null,
  p_transaction_reference text default null
)
returns table (
  booking_id uuid,
  refund_status text,
  payment_marked_refunded boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row record;
  normalized_response text := nullif(left(trim(coalesce(p_admin_response, '')), 1000), '');
  normalized_reference text := nullif(left(trim(coalesce(p_transaction_reference, '')), 200), '');
  next_status text;
  fully_refunded boolean := false;
begin
  if not exists (
    select 1 from public.admin_roles
    where user_id = auth.uid() and privilege is true
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_action not in ('approve', 'decline', 'processed') then
    raise exception 'INVALID_REFUND_ACTION';
  end if;

  select r.id, r.payment_id, r.booking_id, r.amount_paid, r.status
    into request_row
    from public.payment_refund_requests r
   where r.id = p_request_id
   for update;
  if not found then raise exception 'REFUND_REQUEST_NOT_FOUND'; end if;

  if p_action = 'approve' then
    if request_row.status <> 'awaiting_admin_review' then
      raise exception 'REFUND_NOT_AWAITING_REVIEW';
    end if;
    next_status := 'awaiting_manual_processing';
    update public.payment_refund_requests
       set status = next_status,
           admin_response = normalized_response,
           decided_by = auth.uid(),
           decided_at = now(),
           updated_at = now()
     where id = p_request_id;
  elsif p_action = 'decline' then
    if request_row.status <> 'awaiting_admin_review' then
      raise exception 'REFUND_NOT_AWAITING_REVIEW';
    end if;
    if normalized_response is null then raise exception 'REFUND_DECLINE_REASON_REQUIRED'; end if;
    next_status := 'declined';
    update public.payment_refund_requests
       set status = next_status,
           admin_response = normalized_response,
           decided_by = auth.uid(),
           decided_at = now(),
           updated_at = now()
     where id = p_request_id;
  else
    if request_row.status <> 'awaiting_manual_processing' then
      raise exception 'REFUND_NOT_APPROVED_FOR_PROCESSING';
    end if;
    if p_actual_refund_amount is null
       or p_actual_refund_amount <= 0
       or p_actual_refund_amount > request_row.amount_paid then
      raise exception 'INVALID_ACTUAL_REFUND_AMOUNT';
    end if;
    if normalized_reference is null then raise exception 'REFUND_REFERENCE_REQUIRED'; end if;
    next_status := 'processed';
    fully_refunded := p_actual_refund_amount >= request_row.amount_paid;
    update public.payment_refund_requests
       set status = next_status,
           actual_refund_amount = round(p_actual_refund_amount, 2),
           transaction_reference = normalized_reference,
           admin_response = coalesce(normalized_response, admin_response),
           decided_by = auth.uid(),
           decided_at = coalesce(decided_at, now()),
           processed_at = now(),
           updated_at = now()
     where id = p_request_id;

    if fully_refunded then
      update public.payments
         set status = 'refunded'
       where id = request_row.payment_id
         and status in ('paid', 'success');
    end if;
  end if;

  booking_id := request_row.booking_id;
  refund_status := next_status;
  payment_marked_refunded := fully_refunded;
  return next;
end;
$$;

revoke all on function public.admin_decide_payment_refund_request(uuid, text, text, numeric, text) from public, anon;
grant execute on function public.admin_decide_payment_refund_request(uuid, text, text, numeric, text) to authenticated;

comment on table public.payment_refund_requests is
  'Admin-requested refunds tied to guest booking payments; kept separate from booking cancellation requests.';