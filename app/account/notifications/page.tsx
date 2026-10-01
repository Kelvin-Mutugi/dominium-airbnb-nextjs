import { getAccountContext } from '@/app/lib/account';
import { formatDateTime, humanize } from '@/app/lib/format';
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
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl text-neutral-900 sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-neutral-500">Customer support replies, payment updates, and booking decisions.</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="text-sm font-semibold text-[#9C2454] underline underline-offset-2">Mark all as read</button>
          </form>
        )}
      </header>

      {notifications.length === 0 ? (
        <p className="account-neu-surface rounded-3xl px-5 py-10 text-center text-sm text-neutral-600">You’re all caught up. New trip activity will appear here.</p>
      ) : (
        <ol className="space-y-3">
          {notifications.map((notification) => (
            <li key={notification.id} className={`flex flex-wrap items-start justify-between gap-4 rounded-2xl p-4 ${notification.read_at ? 'account-neu-surface' : 'account-neu-lift bg-[#FCE8F0]'}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {!notification.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-[#E23E85]" aria-label="Unread" />}
                  <p className="font-medium text-neutral-900">{notification.title}</p>
                  <span className="text-xs text-neutral-500">{notification.category === 'message' ? 'Customer Support' : humanize(notification.category)}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-neutral-600">{notification.body}</p>
                <time dateTime={notification.created_at} className="mt-1 block text-xs text-neutral-500">{formatDateTime(notification.created_at)}</time>
                <form action={openNotification} className="mt-2">
                  <input type="hidden" name="notification_id" value={notification.id} />
                  <button type="submit" className="min-h-11 text-left text-sm font-semibold text-[#9C2454] underline underline-offset-2">{notification.category === 'message' ? 'Open support conversation' : 'Open booking'}</button>
                </form>
              </div>
              {!notification.read_at && (
                <form action={markNotificationRead}>
                  <input type="hidden" name="notification_id" value={notification.id} />
                  <button type="submit" className="min-h-11 px-2 text-sm font-medium text-neutral-600 underline underline-offset-2">Mark read</button>
                </form>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}