'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/app/lib/supabase/server';
import { recordAdminAuditEvent } from '@/app/lib/admin-audit';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';

const STATUSES = ['new', 'in_review', 'waiting_on_user', 'resolved', 'closed'];

export async function updateSupportCase(formData: FormData) {
  const caseId = String(formData.get('case_id') ?? '');
  const status = String(formData.get('status') ?? '');
  const publicReply = String(formData.get('public_reply') ?? '').trim();
  const adminNotes = String(formData.get('admin_notes') ?? '').trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(caseId)) {
    throw new Error('Invalid support case.');
  }
  if (!STATUSES.includes(status) || publicReply.length > 5000 || adminNotes.length > 5000) {
    throw new Error('Invalid support update.');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in.');

  const admin = getSupabaseAdmin();
  const { data: role } = await admin
    .from('admin_roles')
    .select('privilege')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!role?.privilege) throw new Error('You are not authorized to update support cases.');

  const { data: previousCase, error: lookupError } = await admin
    .from('support_cases')
    .select('status, public_reply')
    .eq('id', caseId)
    .maybeSingle();
  if (lookupError || !previousCase) throw new Error('Support case not found.');

  const { data: updatedCase, error } = await admin
    .from('support_cases')
    .update({
      status,
      public_reply: publicReply || null,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseId)
    .eq('status', previousCase.status)
    .select('id')
    .maybeSingle();
  if (error) throw new Error('Unable to update this support case.');
  if (!updatedCase) throw new Error('Support case changed. Refresh and try again.');

  if (publicReply && publicReply !== (previousCase.public_reply ?? '')) {
    const { error: messageError } = await admin.from('support_case_messages').insert({
      case_id: caseId,
      sender_id: user.id,
      sender_role: 'support',
      body: publicReply,
    });
    if (messageError) throw new Error('Support case was updated, but the reply was not added to its conversation.');
  }

  await recordAdminAuditEvent({
    actorId: user.id,
    action: 'support_case.updated',
    entityType: 'support_case',
    entityId: caseId,
    summary: 'Updated support case status and response.',
    before: { status: previousCase.status },
    after: { status },
  });

  revalidatePath('/admin/support');
  revalidatePath('/account/support');
}