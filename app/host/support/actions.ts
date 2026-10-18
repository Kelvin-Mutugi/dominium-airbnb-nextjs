'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireHost } from '@/app/lib/host-auth';
import { createClient } from '@/app/lib/supabase/server';

const CATEGORIES = [
  'booking_issue',
  'payment_refund',
  'host_guest_concern',
  'listing_issue',
  'account',
  'other',
] as const;

function redirectWithError(message: string): never {
  redirect(`/host/support?error=${encodeURIComponent(message)}`);
}

export async function submitHostSupportCase(formData: FormData) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const category = String(formData.get('category') ?? '');
  const subject = String(formData.get('subject') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const bookingId = String(formData.get('booking_id') ?? '').trim();

  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    redirectWithError('Choose a valid support topic.');
  }
  if (subject.length < 5 || subject.length > 120) {
    redirectWithError('Subject must be 5 to 120 characters.');
  }
  if (message.length < 20 || message.length > 5000) {
    redirectWithError('Details must be 20 to 5000 characters.');
  }

  let verifiedBookingId: string | null = null;
  if (bookingId) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        bookingId,
      )
    ) {
      redirectWithError('Choose a valid booking.');
    }
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .eq('host_id', user.id)
      .maybeSingle();
    if (error) {
      console.error('Unable to validate host support booking:', error);
      redirectWithError('We could not verify that booking. Please try again.');
    }
    if (!booking) redirectWithError('That booking is not available to your host account.');
    verifiedBookingId = booking.id;
  }

  const { error } = await supabase.from('support_cases').insert({
    user_id: user.id,
    support_context: 'host',
    booking_id: verifiedBookingId,
    category,
    subject,
    message,
  });
  if (error) {
    console.error('Unable to submit host support case:', error);
    redirectWithError('We could not send your request. Please try again.');
  }

  revalidatePath('/host/support');
  revalidatePath('/admin/support');
  redirect('/host/support?submitted=1');
}
