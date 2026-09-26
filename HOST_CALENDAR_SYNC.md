# Host Calendar Sync

Hosts can import iCalendar feeds from Airbnb, Booking.com, Vrbo, HomeAway, Google Calendar, and Outlook. Imported dates are private busy periods and do not create platform bookings or copy guest details. Feeds are refreshed when connected, on manual request, and on demand when a guest checks listing availability. A stale feed is refreshed at most once every five minutes per listing calendar.

## Deployment setup

Apply `supabase/migrations/20260926140000_host_calendar_sync.sql`, `supabase/migrations/20260926150000_enforce_guest_calendar_availability.sql`, and `supabase/migrations/20260926160000_calendar_on_demand_sync.sql` before deploying the application changes. These create calendar storage, enforce booking availability, and add a short-lived sync lease to prevent duplicate feed requests when guests check the same listing concurrently.

No external scheduler or cron secret is required. The existing server configuration must include `SUPABASE_SERVICE_ROLE_KEY`; this key must remain server-only. Guests trigger a stale-feed refresh through the availability endpoint, while hosts can always request a sync from the host calendar.

## Calendar links

Each listing can connect one or more external HTTPS iCalendar feeds from the supported providers. The host can also generate a private Dominium `.ics` link for each listing and subscribe to it on other platforms. Regenerating that link revokes the previous URL. Anyone who has the private URL can read the listing's busy dates, so hosts should treat it like a password.

Calendar feed updates are not instantaneous. A feed may be up to five minutes old until a guest checks availability or the host syncs it manually, and iCal providers choose their own publishing intervals. Hosts should check conflicts and confirm availability when accepting an outside reservation.