'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/server';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';
import { recordAdminAuditEvent } from '@/app/lib/admin-audit';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const THREAD_STATUSES = ['waiting_on_admin', 'waiting_on_requester', 'resolved', 'closed'] as const;

export type CustomerSupportThreadStatus = (typeof THREAD_STATUSES)[number];
export type CustomerSupportRole = 'guest' | 'host' | 'admin';
export type CustomerSupportMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: CustomerSupportRole;
  body: string;
  created_at: string;
};
export type CustomerSupportThread = {
  id: string;
  booking_id: string;
  requester_id: string;
  requester_role: Exclude<CustomerSupportRole, 'admin'>;
  status: CustomerSupportThreadStatus;
  created_at: string;
  updated_at: string;
  requester_last_read_at: string;
  admin_last_read_at: string | null;
};

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Your session has expired. Sign in again to continue.');
  return user;
}

async function requireAdminUser() {
  const user = await getCurrentUser();
  const admin = getSupabaseAdmin();
  const { data: role, error } = await admin
    .from('admin_roles')
    .select('privilege')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !role?.privilege) throw new Error('You are not authorized to access customer support.');
  return { user, admin };
}

export async function openCustomerSupportThreadForBooking(bookingId: string, requesterRole: 'guest' | 'host') {
  if (!UUID_PATTERN.test(bookingId) || !['guest', 'host'].includes(requesterRole)) {
    throw new Error('Choose a valid booking participant.');
  }

  const { user, admin } = await requireAdminUser();
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('id, guest_id, host_id')
    .eq('id', bookingId)
    .maybeSingle();
  if (bookingError || !booking) throw new Error('Booking not found.');

  const requesterId = requesterRole === 'guest' ? booking.guest_id : booking.host_id;
  if (!requesterId) {
    throw new Error(requesterRole === 'guest'
      ? 'This guest booked without an account, so an in-app guest chat is unavailable.'
      : 'This booking has no host account linked.');
  }

  const { error: createError } = await admin
    .from('customer_support_threads')
    .upsert({
      booking_id: booking.id,
      requester_id: requesterId,
      requester_role: requesterRole,
      status: 'waiting_on_admin',
    }, { onConflict: 'booking_id,requester_id', ignoreDuplicates: true });
  if (createError) throw new Error('Unable to open customer support for this booking.');

  const { data: thread, error: threadError } = await admin
    .from('customer_support_threads')
    .select('id')
    .eq('booking_id', booking.id)
    .eq('requester_id', requesterId)
    .single();
  if (threadError || !thread) throw new Error('Unable to load the customer support conversation.');

  await recordAdminAuditEvent({
    actorId: user.id,
    action: 'customer_support.opened_from_booking',
    entityType: 'booking',
    entityId: booking.id,
    summary: `Opened the ${requesterRole} support conversation for booking ${booking.id}.`,
    after: { thread_id: thread.id, requester_role: requesterRole },
  });

  revalidatePath('/admin/customer-support');
  redirect(`/admin/customer-support/${thread.id}`);
}

export async function getCustomerSupportConversation(bookingId: string) {
  if (!UUID_PATTERN.test(bookingId)) throw new Error('Choose a valid booking.');
  const user = await getCurrentUser();
  const session = await createClient();
  const { data: booking, error: bookingError } = await session
    .from('bookings')
    .select('id, guest_id, host_id')
    .eq('id', bookingId)
    .maybeSingle();
  if (bookingError || !booking) throw new Error('Booking not found.');

  const requesterRole = booking.guest_id === user.id ? 'guest' : booking.host_id === user.id ? 'host' : null;
  if (!requesterRole) throw new Error('You are not a participant in this booking.');

  const admin = getSupabaseAdmin();
  const { error: createError } = await admin
    .from('customer_support_threads')
    .upsert({
      booking_id: bookingId,
      requester_id: user.id,
      requester_role: requesterRole,
      status: 'waiting_on_admin',
    }, { onConflict: 'booking_id,requester_id', ignoreDuplicates: true });
  if (createError) throw new Error('Unable to open customer support for this booking. Apply the customer support migration and try again.');

  const { data: thread, error: threadError } = await admin
    .from('customer_support_threads')
    .select('id, booking_id, requester_id, requester_role, status, created_at, updated_at, requester_last_read_at, admin_last_read_at')
    .eq('booking_id', bookingId)
    .eq('requester_id', user.id)
    .single();
  if (threadError || !thread) throw new Error('Unable to load this customer support conversation.');

  const now = new Date().toISOString();
  const [{ data: messages, error: messagesError }, { error: readError }] = await Promise.all([
    admin.from('customer_support_messages')
      .select('id, thread_id, sender_id, sender_role, body, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })
      .limit(250),
    admin.from('customer_support_threads')
      .update({ requester_last_read_at: now })
      .eq('id', thread.id)
      .eq('requester_id', user.id),
  ]);
  if (messagesError || readError) throw new Error('Unable to load this customer support conversation.');

  return {
    thread: { ...thread, requester_last_read_at: now } as CustomerSupportThread,
    messages: (messages ?? []) as CustomerSupportMessage[],
  };
}

export async function sendCustomerSupportMessage(threadId: string, body: string) {
  if (!UUID_PATTERN.test(threadId)) throw new Error('Choose a valid support conversation.');
  const message = body.trim();
  if (message.length < 1 || message.length > 5000) throw new Error('Messages must be between 1 and 5000 characters.');

  const user = await getCurrentUser();
  const admin = getSupabaseAdmin();
  const { data: thread, error: threadError } = await admin
    .from('customer_support_threads')
    .select('id, booking_id, requester_role, status')
    .eq('id', threadId)
    .eq('requester_id', user.id)
    .maybeSingle();
  if (threadError || !thread) throw new Error('Support conversation not found.');
  const now = new Date().toISOString();
  const { error: insertError } = await admin.from('customer_support_messages').insert({
    thread_id: threadId,
    sender_id: user.id,
    sender_role: thread.requester_role,
    body: message,
  });
  if (insertError) throw new Error('Unable to send your message. Please try again.');

  const { error: updateError } = await admin
    .from('customer_support_threads')
    .update({ status: 'waiting_on_admin', updated_at: now, requester_last_read_at: now })
    .eq('id', threadId)
    .eq('requester_id', user.id);
  if (updateError) throw new Error('Message sent, but the conversation status could not be updated. Refresh to check.');
  revalidatePath('/account/bookings');
  revalidatePath(`/account/bookings/${thread.booking_id}`);
  revalidatePath('/host/bookings');
  revalidatePath('/admin/customer-support');
  revalidatePath(`/host/bookings/${thread.booking_id}`);
}

export async function getRequesterSupportUnreadCounts(userId: string, bookingIds: string[]) {
  const user = await getCurrentUser();
  if (user.id !== userId) throw new Error('You are not authorized to load these support counts.');
  const uniqueIds = [...new Set(bookingIds)].filter((id) => UUID_PATTERN.test(id));
  if (!uniqueIds.length) return {} as Record<string, number>;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('customer_support_threads')
    .select('id, booking_id, requester_last_read_at')
    .eq('requester_id', user.id)
    .in('booking_id', uniqueIds)
    .eq('status', 'waiting_on_requester');
  if (error) throw new Error('Unable to load customer support replies.');
  const threads = data ?? [];
  if (!threads.length) return {} as Record<string, number>;
  const { data: messages, error: messagesError } = await admin
    .from('customer_support_messages')
    .select('thread_id, created_at')
    .in('thread_id', threads.map((thread) => thread.id))
    .eq('sender_role', 'admin');
  if (messagesError) throw new Error('Unable to load customer support replies.');

  const threadById = new Map(threads.map((thread) => [thread.id, thread]));
  const counts: Record<string, number> = {};
  for (const message of messages ?? []) {
    const thread = threadById.get(message.thread_id);
    if (thread && Date.parse(message.created_at) > Date.parse(thread.requester_last_read_at)) {
      counts[thread.booking_id] = (counts[thread.booking_id] ?? 0) + 1;
    }
  }
  return counts;
}

export async function replyToCustomerSupportThread(threadId: string, body: string) {
  if (!UUID_PATTERN.test(threadId)) throw new Error('Choose a valid support conversation.');
  const message = body.trim();
  if (message.length < 1 || message.length > 5000) throw new Error('Replies must be between 1 and 5000 characters.');
  const { user, admin } = await requireAdminUser();
  const { data: thread, error: threadError } = await admin
    .from('customer_support_threads')
    .select('id, booking_id, status')
    .eq('id', threadId)
    .maybeSingle();
  if (threadError || !thread) throw new Error('Customer support conversation not found.');
  if (thread.status === 'closed') throw new Error('This conversation is closed. Reopen it before replying.');

  const now = new Date().toISOString();
  const { error: insertError } = await admin.from('customer_support_messages').insert({
    thread_id: threadId,
    sender_id: user.id,
    sender_role: 'admin',
    body: message,
  });
  if (insertError) throw new Error('Unable to send the customer support reply.');
  const { error: updateError } = await admin
    .from('customer_support_threads')
    .update({ status: 'waiting_on_requester', updated_at: now, admin_last_read_at: now })
    .eq('id', threadId);
  if (updateError) throw new Error('Reply sent, but the conversation status could not be updated. Refresh to check.');

  await recordAdminAuditEvent({
    actorId: user.id,
    action: 'customer_support.replied',
    entityType: 'booking',
    entityId: thread.booking_id,
    summary: `Replied to booking customer support conversation ${threadId}.`,
  });
  revalidatePath('/admin/customer-support');
  revalidatePath(`/account/bookings/${thread.booking_id}`);
  revalidatePath(`/host/bookings/${thread.booking_id}`);
}

export async function updateCustomerSupportThreadStatus(threadId: string, status: CustomerSupportThreadStatus) {
  if (!UUID_PATTERN.test(threadId) || !THREAD_STATUSES.includes(status)) throw new Error('Invalid customer support update.');
  const { user, admin } = await requireAdminUser();
  const { data: thread, error: lookupError } = await admin
    .from('customer_support_threads')
    .select('booking_id, status')
    .eq('id', threadId)
    .maybeSingle();
  if (lookupError || !thread) throw new Error('Customer support conversation not found.');
  const { error } = await admin
    .from('customer_support_threads')
    .update({ status, updated_at: new Date().toISOString(), admin_last_read_at: new Date().toISOString() })
    .eq('id', threadId);
  if (error) throw new Error('Unable to update customer support status.');
  await recordAdminAuditEvent({
    actorId: user.id,
    action: 'customer_support.status_changed',
    entityType: 'booking',
    entityId: thread.booking_id,
    summary: `Changed booking support conversation status from ${thread.status} to ${status}.`,
    before: { status: thread.status },
    after: { status },
  });
  revalidatePath('/admin/customer-support');
}