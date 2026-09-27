import { getAccountContext } from '@/app/lib/account';
import { formatDate, humanize } from '@/app/lib/format';
import { markAllNotificationsRead, markNotificationRead, openNotification } from './actions';

type NotificationRow = {
  id: string;
  booking_id: string | null;
  category: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export default async function NotificationsPage() {
  const { supabase, user } = await getAccountContext();
  const { data, error } = await supabase
    .from('user_notifications')
    .select('id, booking_id, category, title, body, created_at, read_at')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error('Unable to load notifications. Apply the in-app notifications migration and try again.');

  const notifications = (data ?? []) as NotificationRow[];
  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  return (
    <div className="max-w-4xl">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E23E85]">Your account</p>
          <h1 className="mt-1 font-serif text-3xl text-neutral-900">Notifications</h1>
          <p className="mt-1 text-sm text-neutral-500">Booking messages, payment updates, and trip decisions.</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="text-sm font-semibold text-[#9C2454] underline underline-offset-2">Mark all as read</button>
          </form>
        )}
      </header>

      {notifications.length === 0 ? (
        <p className="border-y border-neutral-200 py-10 text-center text-sm text-neutral-500">You’re all caught up. New trip activity will appear here.</p>
      ) : (
        <ol className="divide-y divide-neutral-200 border-y border-neutral-200">
          {notifications.map((notification) => (
            <li key={notification.id} className={`flex flex-wrap items-start justify-between gap-4 py-5 ${notification.read_at ? '' : 'bg-[#FDF7FA]'}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {!notification.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-[#E23E85]" aria-label="Unread" />}
                  <p className="font-medium text-neutral-900">{notification.title}</p>
                  <span className="text-xs text-neutral-500">{humanize(notification.category)}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-neutral-600">{notification.body}</p>
                <time dateTime={notification.created_at} className="mt-1 block text-xs text-neutral-400">{formatDate(notification.created_at, 'long')}</time>
                <form action={openNotification} className="mt-2">
                  <input type="hidden" name="notification_id" value={notification.id} />
                  <button type="submit" className="text-sm font-semibold text-[#9C2454] underline underline-offset-2">Open trip</button>
                </form>
              </div>
              {!notification.read_at && (
                <form action={markNotificationRead}>
                  <input type="hidden" name="notification_id" value={notification.id} />
                  <button type="submit" className="text-xs font-medium text-neutral-600 underline underline-offset-2">Mark read</button>
                </form>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}