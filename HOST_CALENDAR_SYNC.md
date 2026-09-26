# Host Calendar Sync

Hosts can import iCalendar feeds from Airbnb, Booking.com, Vrbo, HomeAway, Google Calendar, and Outlook. Imported dates are private busy periods and do not create platform bookings or copy guest details. Feeds are refreshed when connected, on manual request, and by the Vercel cron every 30 minutes.

## Deployment setup

Apply `supabase/migrations/20260926140000_host_calendar_sync.sql` and `supabase/migrations/20260926150000_enforce_guest_calendar_availability.sql` before deploying the application changes. The first migration stores calendar connections and imported dates; the second blocks guest booking requests that overlap manual or imported busy dates.

Set `CRON_SECRET` in the Vercel project environment. Vercel sends it as a bearer token when invoking `/api/cron/calendar-sync`. The existing Supabase server configuration must include `SUPABASE_SERVICE_ROLE_KEY`; this key must remain server-only.

If deploying outside Vercel, configure a scheduler to send an authenticated `GET` request to `/api/cron/calendar-sync` every 30 minutes, with `Authorization: Bearer $CRON_SECRET`.

## Calendar links

Each listing can connect one or more external HTTPS iCalendar feeds from the supported providers. The host can also generate a private Dominium `.ics` link for each listing and subscribe to it on other platforms. Regenerating that link revokes the previous URL. Anyone who has the private URL can read the listing's busy dates, so hosts should treat it like a password.

Calendar feed updates are not instantaneous. iCal providers and subscribing platforms choose their own refresh intervals, so hosts should check conflicts and confirm availability when accepting an outside reservation.