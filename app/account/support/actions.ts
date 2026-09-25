'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/server';

const CATEGORIES = [
  'booking_issue',
  'payment_refund',
  'host_guest_concern',
  'listing_issue',
  'account',
  'other',
] as const;

export async function submitSupportCase(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin?redirectTo=/account/support');

  const category = String(formData.get('category') ?? '');
  const subject = String(formData.get('subject') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const bookingId = String(formData.get('booking_id') ?? '').trim();

  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    redirect('/account/support?error=Choose+a+valid+request+type.');
  }
  if (subject.length < 5 || subject.length > 120) {
    redirect('/account/support?error=Subject+must+be+5+to+120+characters.');
  }
  if (message.length < 20 || message.length > 5000) {
    redirect('/account/support?error=Details+must+be+20+to+5000+characters.');
  }

  let verifiedBookingId: string | null = null;
  if (bookingId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookingId)) {
      redirect('/account/support?error=Choose+a+valid+booking.');
    }
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .or(`guest_id.eq.${user.id},host_id.eq.${user.id}`)
      .maybeSingle();
    if (!booking) redirect('/account/support?error=That+booking+is+not+available+to+your+account.');
    verifiedBookingId = booking.id;
  }

  const { error } = await supabase.from('support_cases').insert({
    user_id: user.id,
    booking_id: verifiedBookingId,
    category,
    subject,
    message,
  });
  if (error) redirect('/account/support?error=We+could+not+send+your+request.+Please+try+again.');

  redirect('/account/support?submitted=1');
}