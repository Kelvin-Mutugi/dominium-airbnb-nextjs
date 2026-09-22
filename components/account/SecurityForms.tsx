// FILE LOCATION: components/account/SecurityForms.tsx
// Put this file at components/account/SecurityForms.tsx in your project root (or src/components/account/SecurityForms.tsx if your project has a src/ folder).

'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { routes } from '@/app/lib/routes';
import type { ActionResult } from '@/types/account';
import { useAction } from './useAction';
import { Field, FormMessage, btnPrimary, btnSecondary, inputClass } from './ui';

export function PasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const { run, pending, result } = useAction(async (next: string): Promise<ActionResult> => {
    const { error } = await createClient().auth.updateUser({ password: next });
    return error ? { ok: false, error: error.message } : { ok: true, message: 'Password updated.' };
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) return setLocalError('Use at least 8 characters.');
    if (password !== confirm) return setLocalError('The two passwords don’t match.');
    setLocalError(null);
    const res = await run(password);
    if (res.ok) {
      setPassword('');
      setConfirm('');
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      <Field label="New password" htmlFor="new_password" hint="At least 8 characters.">
        <input
          id="new_password"
          type="password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          aria-describedby="new_password-hint"
          required
        />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm_password">
        <input
          id="confirm_password"
          type="password"
          className={inputClass}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Updating…' : 'Update password'}
        </button>
        {localError ? (
          <p role="alert" className="text-sm text-rose-700">
            {localError}
          </p>
        ) : (
          <FormMessage result={result} />
        )}
      </div>
    </form>
  );
}

export function SignOutEverywhere() {
  const router = useRouter();
  const { run, pending, result } = useAction(async (): Promise<ActionResult> => {
    const { error } = await createClient().auth.signOut({ scope: 'global' });
    return error ? { ok: false, error: 'We couldn’t sign you out everywhere. Try again.' } : { ok: true };
  });

  async function onClick() {
    const res = await run();
    if (res.ok) {
      router.replace(routes.login);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button type="button" onClick={onClick} disabled={pending} className={btnSecondary}>
        {pending ? 'Signing out…' : 'Sign out of all devices'}
      </button>
      <FormMessage result={result} />
    </div>
  );
}