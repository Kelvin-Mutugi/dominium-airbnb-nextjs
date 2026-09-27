'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/app/lib/supabase/server';
import type { ActionResult } from '@/types/account';

export async function sendBookingMessage(bookingId: string, body: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session has expired. Sign in again to continue.' };

  const message = body.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookingId)) {
    return { ok: false, error: 'Choose a valid booking.' };
  }
  if (message.length < 1 || message.length > 5000) {
    return { ok: false, error: 'Messages must be between 1 and 5000 characters.' };
  }

  const { error } = await supabase.from('booking_messages').insert({
    booking_id: bookingId,
    sender_id: user.id,
    body: message,
  });
  if (error) return { ok: false, error: 'We couldn’t send your message. Check that you’re part of this booking.' };

  revalidatePath(`/account/bookings/${bookingId}`);
  revalidatePath(`/host/bookings/${bookingId}`);
  revalidatePath('/account/bookings');
  revalidatePath('/host/bookings');
  return { ok: true, message: 'Message sent.' };
}

export async function markBookingThreadRead(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session has expired. Sign in again to continue.' };

  const { error } = await supabase.from('booking_thread_reads').upsert({
    booking_id: bookingId,
    user_id: user.id,
    last_read_at: new Date().toISOString(),
  }, { onConflict: 'booking_id,user_id' });
  if (error) return { ok: false, error: 'Unable to update the trip message status.' };

  revalidatePath('/account/bookings');
  revalidatePath('/host/bookings');
  return { ok: true };
}