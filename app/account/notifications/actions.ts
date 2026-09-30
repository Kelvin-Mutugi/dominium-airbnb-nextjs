'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/server';

export async function markNotificationRead(formData: FormData) {
  const notificationId = String(formData.get('notification_id') ?? '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(notificationId)) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId).eq('recipient_id', user.id).is('read_at', null);
  revalidatePath('/account/notifications');
}

export async function openNotification(formData: FormData) {
  const notificationId = String(formData.get('notification_id') ?? '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(notificationId)) redirect('/account/notifications');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin?redirectTo=/account/notifications');
  const { data: notification } = await supabase
    .from('user_notifications')
    .select('booking_id, category')
    .eq('id', notificationId)
    .eq('recipient_id', user.id)
    .maybeSingle();
  if (!notification) redirect('/account/notifications');

  if (notification.booking_id) {
    await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId).eq('recipient_id', user.id).is('read_at', null);
    revalidatePath('/account/notifications');
    redirect(notification.category === 'message'
      ? `/account/bookings/${notification.booking_id}#customer-support-conversation-heading`
      : `/account/bookings/${notification.booking_id}`);
  }
  redirect('/account/notifications');
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', user.id).is('read_at', null);
  revalidatePath('/account/notifications');
}