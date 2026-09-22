// FILE LOCATION: app/account/profile/actions.ts
// Put this file at app/account/profile/actions.ts in your project root (or src/app/account/profile/actions.ts if your project has a src/ folder).

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/app/lib/supabase/server';
import { normalizePhone } from '@/app/lib/format';
import type { ActionResult } from '@/types/account';

const SESSION_EXPIRED = 'Your session has expired. Sign in again to continue.';
const SAVE_FAILED = 'We couldn’t save your changes. Try again in a moment.';

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Only whitelisted columns are ever written. role, status, host_verified_at
 * and admin_permissions are never touched from the account area.
 */
export async function updateProfile(input: {
  full_name: string;
  phone: string;
  business_name?: string;
  host_bio?: string;
}): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };

  const fullName = (input.full_name ?? '').trim();
  if (fullName.length < 2 || fullName.length > 80) {
    return { ok: false, error: 'Enter your full name (2 to 80 characters).' };
  }
  const phone = normalizePhone(input.phone ?? '');
  if (!phone) {
    return { ok: false, error: 'Enter a valid phone number, like 0712 345 678 or +254 712 345 678.' };
  }

  const update: Record<string, unknown> = {
    full_name: fullName,
    phone,
    updated_at: new Date().toISOString(),
  };

  const { data: current } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (current?.role === 'host') {
    update.business_name = (input.business_name ?? '').trim().slice(0, 100) || null;
    update.host_bio = (input.host_bio ?? '').trim().slice(0, 1000) || null;
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidatePath('/account', 'layout');
  return { ok: true, message: 'Profile saved.' };
}

export async function updateAvatar(url: string | null): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };

  if (url) {
    // Only accept files this user uploaded to the avatars bucket.
    const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`;
    if (!url.startsWith(prefix)) return { ok: false, error: 'That image isn’t valid. Upload it again.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidatePath('/account', 'layout');
  return { ok: true, message: url ? 'Photo updated.' : 'Photo removed.' };
}

export async function updatePayout(input: {
  method: string;
  details: Record<string, string>;
}): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };

  const { data: current } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (current?.role !== 'host') return { ok: false, error: 'Only hosts can set a payout method.' };

  const d = input.details ?? {};
  const accountName = (d.account_name ?? '').trim().slice(0, 100);
  if (accountName.length < 2) return { ok: false, error: 'Enter the name on the account.' };

  let details: Record<string, string>;
  if (input.method === 'mpesa') {
    const phone = normalizePhone(d.phone ?? '');
    if (!phone || !phone.startsWith('+254')) {
      return { ok: false, error: 'Enter the Safaricom number registered for M-Pesa, like 0712 345 678.' };
    }
    details = { phone, account_name: accountName };
  } else if (input.method === 'bank') {
    const bankName = (d.bank_name ?? '').trim().slice(0, 100);
    const accountNumber = (d.account_number ?? '').replace(/\s/g, '');
    if (bankName.length < 2) return { ok: false, error: 'Enter your bank’s name.' };
    if (!/^\d{6,20}$/.test(accountNumber)) return { ok: false, error: 'Enter the account number using digits only.' };
    details = { bank_name: bankName, account_name: accountName, account_number: accountNumber };
  } else {
    return { ok: false, error: 'Choose a payout method.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ payout_method: input.method, payout_details: details, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidatePath('/account/payouts');
  return { ok: true, message: 'Payout method saved.' };
}