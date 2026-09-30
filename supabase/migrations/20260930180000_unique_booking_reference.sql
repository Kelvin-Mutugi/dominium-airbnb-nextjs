create sequence if not exists public.booking_reference_seq;

alter table public.bookings
  add column if not exists booking_reference text;

update public.bookings
   set booking_reference = 'BK-' || nextval('public.booking_reference_seq')::text
 where booking_reference is null;

select setval(
  'public.booking_reference_seq',
  coalesce((
    select max(substring(booking_reference from 4)::bigint)
      from public.bookings
     where booking_reference ~ '^BK-[0-9]+$'
  ), 0) + 1,
  false
);

alter table public.bookings
  alter column booking_reference set default ('BK-' || nextval('public.booking_reference_seq')::text),
  alter column booking_reference set not null;

alter sequence public.booking_reference_seq
  owned by public.bookings.booking_reference;

create unique index if not exists bookings_booking_reference_uidx
  on public.bookings (booking_reference);

grant select (booking_reference)
  on table public.bookings to authenticated;
