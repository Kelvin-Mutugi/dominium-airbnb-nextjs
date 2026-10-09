// FILE LOCATION: components/account/PayoutForm.tsx
// Put this file at components/account/PayoutForm.tsx in your project root (or src/components/account/PayoutForm.tsx if your project has a src/ folder).

'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { updatePayout } from '@/app/account/profile/actions';
import { useAction } from './useAction';
import { Field, FormMessage, btnPrimary, inputClass } from './ui';

export function PayoutForm({
  method: initialMethod,
  details,
}: {
  method: string | null;
  details: Record<string, string> | null;
}) {
  const method = 'mpesa';
  const [values, setValues] = useState({
    phone: details?.phone ?? '',
    account_name: details?.account_name ?? '',
  });
  const { run, pending, result } = useAction(updatePayout);

  const set = (key: keyof typeof values) => (e: ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    run({
      method,
      details:
        method === 'mpesa'
          ? { phone: values.phone, account_name: values.account_name }
          : {},
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      <Field label="Safaricom M-Pesa number" htmlFor="payout_phone">
        <input
          id="payout_phone"
          type="tel"
          className={inputClass}
          value={values.phone}
          onChange={set('phone')}
          placeholder="0712 345 678"
          required
        />
      </Field>
      {initialMethod !== 'mpesa' && (
        <p className="text-sm text-amber-800">
          Host payouts now use Safaricom M-Pesa. Add an M-Pesa number to receive future payouts.
        </p>
      )}

      <Field label="Name on the account" htmlFor="account_name">
        <input id="account_name" className={inputClass} value={values.account_name} onChange={set('account_name')} required />
      </Field>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Saving…' : 'Save payout method'}
        </button>
        <FormMessage result={result} />
      </div>
    </form>
  );
}