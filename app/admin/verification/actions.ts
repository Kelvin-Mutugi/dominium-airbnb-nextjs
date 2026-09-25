'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/app/lib/admin-auth';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';

export async function reviewHostVerification(formData: FormData) {
  const adminUser = await requireAdmin();
  const hostId = String(formData.get('host_id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(hostId)) {
    throw new Error('Invalid host profile.');
  }
  if (decision !== 'approved' && decision !== 'rejected') {
    throw new Error('Choose an approve or reject decision.');
  }
  if (decision === 'rejected' && (reason.length < 10 || reason.length > 1000)) {
    throw new Error('Provide an actionable rejection reason of at least 10 characters.');
  }

  const admin = getSupabaseAdmin();
  const { data: host, error: lookupError } = await admin
    .from('profiles')
    .select('id, kyc_status, id_document_url')
    .eq('id', hostId)
    .eq('role', 'host')
    .maybeSingle();
  if (lookupError || !host) throw new Error('Host application not found.');
  if (host.kyc_status !== 'pending') {
    throw new Error('This host application is no longer awaiting review.');
  }
  if (decision === 'approved' && !host.id_document_url) {
    throw new Error('The host must upload an ID document before approval.');
  }
  if (decision === 'approved') {
    const { error: documentError } = await admin.storage
      .from('host-documents')
      .createSignedUrl(host.id_document_url, 60);
    if (documentError) throw new Error('The ID document is unavailable for review. Ask the host to resubmit it.');
  }

  const reviewedAt = new Date().toISOString();
  const { data, error } = await admin
    .from('profiles')
    .update({
      kyc_status: decision,
      host_verified_at: decision === 'approved' ? reviewedAt : null,
      kyc_reviewed_at: reviewedAt,
      kyc_reviewed_by: adminUser.id,
      kyc_rejection_reason: decision === 'rejected' ? reason : null,
    })
    .eq('id', hostId)
    .eq('kyc_status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) throw new Error('Unable to save the host verification decision.');
  if (!data) throw new Error('Another administrator already reviewed this application. Refresh the queue.');

  revalidatePath('/admin/verification');
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${hostId}`);
  revalidatePath('/account', 'layout');
  revalidatePath('/host');
  revalidatePath('/host/pending-review');
}