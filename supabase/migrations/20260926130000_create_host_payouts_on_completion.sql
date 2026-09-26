create or replace function public.create_host_payout_for_completed_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.payouts (booking_id, host_id, amount, status)
    select new.id, new.host_id, new.host_payout_amount, 'owed'
    where not exists (
      select 1
        from public.payouts p
       where p.booking_id = new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists create_host_payout_after_booking_completion on public.bookings;

create trigger create_host_payout_after_booking_completion
after update of status on public.bookings
for each row
when (new.status = 'completed' and old.status is distinct from 'completed')
execute function public.create_host_payout_for_completed_booking();

insert into public.payouts (booking_id, host_id, amount, status)
select b.id, b.host_id, b.host_payout_amount, 'owed'
  from public.bookings b
 where b.status = 'completed'
   and not exists (
     select 1
       from public.payouts p
      where p.booking_id = b.id
   );