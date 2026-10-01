'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { createClient } from '@/app/lib/supabase/client';
import { routes } from '@/app/lib/routes';
import { btnSecondary } from './ui';

export function AccountSignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace(routes.home);
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} disabled={busy} className={btnSecondary}>
      <LogOut size={16} aria-hidden="true" />
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}