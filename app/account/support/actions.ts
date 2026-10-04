'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/app/lib/supabase/server';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export async function sendSupportCaseMessage(caseId: string, body: string) {
  if (!UUID_PATTERN.test(caseId)) throw new Error('Choose a valid support request.');
  const message = body.trim();
  if (message.length < 1 || message.length > 5000) {
    throw new Error('Your reply must be between 1 and 5000 characters.');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Your session has expired. Sign in again to reply.');

  const admin = getSupabaseAdmin();
  const { data: supportCase, error: caseError } = await admin
    .from('support_cases')
    .select('id')
    .eq('id', caseId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (caseError || !supportCase) throw new Error('Support request not found.');

  const { error: insertError } = await admin.from('support_case_messages').insert({
    case_id: caseId,
    sender_id: user.id,
    sender_role: 'requester',
    body: message,
  });
  if (insertError) throw new Error('Unable to send your reply. Please try again.');

  const { error: updateError } = await admin
    .from('support_cases')
    .update({ status: 'in_review', updated_at: new Date().toISOString() })
    .eq('id', caseId)
    .eq('user_id', user.id);
  if (updateError) console.error('Unable to refresh support case status after requester reply:', updateError);

  revalidatePath('/account/support');
  revalidatePath('/admin/support');
}