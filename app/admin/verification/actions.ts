'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/app/lib/admin-auth';
import { recordAdminAuditEvent } from '@/app/lib/admin-audit';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';

const MPESA_REGEX = /^0\d{9}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HOST_TERMS_VERSION = '2026-11-01';

function isAdult(dateOfBirth: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return false;
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return false;
  if (birth.toISOString().slice(0, 10) !== dateOfBirth) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age >= 18;
}

export async function submitHostApplicationForUser(formData: FormData) {
  const adminUser = await requireAdmin();
  const accountType = String(formData.get('accountType') ?? '');
  const accountEmail = String(formData.get('accountEmail') ?? '').trim().toLowerCase();
  const existingUserId = String(formData.get('existingUserId') ?? '');
  const fullName = String(formData.get('fullName') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const alternatePhone = String(formData.get('alternatePhone') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const hostType = String(formData.get('hostType') ?? '');
  const businessName = String(formData.get('businessName') ?? '').trim();
  const dateOfBirth = String(formData.get('dateOfBirth') ?? '');
  const county = String(formData.get('county') ?? '').trim();
  const residentialAddress = String(formData.get('residentialAddress') ?? '').trim();
  const mpesaNumber = String(formData.get('mpesaNumber') ?? '').trim();
  const hostBio = String(formData.get('hostBio') ?? '').trim();

  if (accountType !== 'existing' && accountType !== 'new') {
    throw new Error('Choose an existing account or create a new host account.');
  }
  if (fullName.length < 2 || fullName.length > 120) {
    throw new Error('Enter a full legal name between 2 and 120 characters.');
  }
  if (!MPESA_REGEX.test(phone)) throw new Error('Enter a valid phone number, e.g. 0712345678.');
  if (alternatePhone && !MPESA_REGEX.test(alternatePhone)) {
    throw new Error('Enter a valid alternate phone number, e.g. 0712345678.');
  }
  if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    throw new Error('Enter a valid host contact email address.');
  }
  if (businessName.length > 160) throw new Error('Company name must be 160 characters or fewer.');
  if (hostType !== 'individual' && hostType !== 'company') {
    throw new Error('Choose an individual or company host account.');
  }
  if (hostType === 'company' && !businessName) {
    throw new Error('Company name is required for company hosts.');
  }
  if (!isAdult(dateOfBirth)) throw new Error('The host must be at least 18 years old.');
  if (!county || county.length > 100) throw new Error('Enter a county of residence.');
  if (!residentialAddress || residentialAddress.length > 500) {
    throw new Error('Residential address is required and must be 500 characters or fewer.');
  }
  if (hostBio.length > 2000) throw new Error('About the host must be 2,000 characters or fewer.');
  if (!MPESA_REGEX.test(mpesaNumber)) {
    throw new Error('Enter a valid M-Pesa number, e.g. 0712345678.');
  }
  if (formData.get('agreedToHostTerms') !== 'true') {
    throw new Error('Confirm that the host agreed to the Host Listing Agreement and Terms of Service.');
  }
  if (formData.get('hostAuthorized') !== 'true') {
    throw new Error('Confirm that the host authorized you to submit these details.');
  }

  const admin = getSupabaseAdmin();
  let hostId: string;
  let priorProfile: {
    id: string;
    role: string | null;
    kyc_status: string | null;
    kyc_submitted_at: string | null;
    host_verified_at: string | null;
  } | null = null;

  if (accountType === 'existing') {
    if (!UUID_REGEX.test(existingUserId)) {
      throw new Error('Choose an existing user from the Admin Users list.');
    }
    const { data: authResult, error: authError } = await admin.auth.admin.getUserById(existingUserId);
    if (authError || !authResult.user) {
      throw new Error('Unable to verify the selected user account.');
    }
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, role, kyc_status, kyc_submitted_at, host_verified_at')
      .eq('id', existingUserId)
      .maybeSingle();
    if (profileError) throw new Error('Unable to load the selected user account.');
    if (!profile) throw new Error('The selected user has no profile record.');
    if (!UUID_REGEX.test(profile.id)) throw new Error('The user account has an invalid profile ID.');
    if (profile.role !== 'guest' && profile.role !== 'host') {
      throw new Error('Only guest accounts or unverified host accounts can be converted.');
    }
    if (profile.host_verified_at || profile.kyc_status === 'approved') {
      throw new Error('This user is already a verified host.');
    }
    if (
      profile.kyc_status === 'pending' ||
      (profile.kyc_submitted_at && profile.kyc_status !== 'rejected')
    ) {
      throw new Error('This host application is already under review.');
    }
    hostId = profile.id;
    priorProfile = profile;
  } else {
    if (accountEmail.length > 254 || !EMAIL_REGEX.test(accountEmail)) {
      throw new Error('Enter a valid account email address.');
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const redirectTo = appUrl
      ? `${appUrl}/auth/callback?next=${encodeURIComponent('/host/pending-review')}`
      : undefined;
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      accountEmail,
      {
        data: { full_name: fullName, phone },
        ...(redirectTo ? { redirectTo } : {}),
      },
    );
    if (inviteError) {
      throw new Error(`Could not invite this account: ${inviteError.message}`);
    }
    if (!invited.user) throw new Error('The invitation was sent without a user account. Contact support.');
    hostId = invited.user.id;
  }

  const submittedAt = new Date().toISOString();
  const { error: saveError } = await admin.from('profiles').upsert({
    id: hostId,
    full_name: fullName,
    phone,
    alternate_phone: alternatePhone || null,
    email,
    role: 'host',
    host_type: hostType,
    business_name: hostType === 'company' ? businessName : null,
    date_of_birth: dateOfBirth,
    county,
    residential_address: residentialAddress,
    payout_method: 'mpesa',
    payout_details: { mpesa_number: mpesaNumber },
    host_bio: hostBio || null,
    kyc_status: 'pending',
    kyc_submitted_at: submittedAt,
    kyc_reviewed_at: null,
    kyc_reviewed_by: null,
    kyc_rejection_reason: null,
    host_verified_at: null,
    host_terms_accepted_at: submittedAt,
    host_terms_version: HOST_TERMS_VERSION,
    host_terms_acceptance_source: 'admin_confirmed',
    host_onboarding_source: 'admin_assisted',
    host_onboarding_submitted_by: adminUser.id,
  });
  if (saveError) {
    throw new Error(
      accountType === 'new'
        ? `The invitation was sent, but the host application could not be saved: ${saveError.message}`
        : `Could not save the host application: ${saveError.message}`,
    );
  }

  await recordAdminAuditEvent({
    actorId: adminUser.id,
    action: 'host_verification.submitted_by_admin',
    entityType: 'host_verification',
    entityId: hostId,
    summary: 'Administrator submitted a host application on the host’s behalf.',
    before: priorProfile
      ? { role: priorProfile.role, kyc_status: priorProfile.kyc_status }
      : null,
    after: {
      status: 'pending',
      source: 'admin_assisted',
      termsConfirmedByAdmin: true,
      accountCreatedByInvitation: accountType === 'new',
    },
  });

  revalidatePath('/admin/verification');
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${hostId}`);
  revalidatePath('/host/pending-review');
  return accountType === 'new';
}

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
    .select('id, kyc_status')
    .eq('id', hostId)
    .eq('role', 'host')
    .maybeSingle();
  if (lookupError || !host) throw new Error('Host application not found.');
  if (host.kyc_status !== 'pending') {
    throw new Error('This host application is no longer awaiting review.');
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

  await recordAdminAuditEvent({
    actorId: adminUser.id,
    action: `host_verification.${decision}`,
    entityType: 'host_verification',
    entityId: hostId,
    summary: `Host verification ${decision}.`,
    before: { status: 'pending' },
    after: { status: decision },
  });

  revalidatePath('/admin/verification');
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${hostId}`);
  revalidatePath('/account', 'layout');
  revalidatePath('/host');
  revalidatePath('/host/pending-review');
  revalidateTag('public-host-profiles', 'max');
}