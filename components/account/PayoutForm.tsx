// FILE LOCATION: components/account/PayoutForm.tsx
// Put this file at components/account/PayoutForm.tsx in your project root (or src/components/account/PayoutForm.tsx if your project has a src/ folder).

'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { updatePayout } from '@/app/account/profile/actions';
import { useAction } from './useAction';
import { Field, FormMessage, btnPrimary, inputClass } from './ui';

type Method = 'mpesa' | 'bank';

const OPTIONS: { id: Method; label: string; hint: string }[] = [
  { id: 'mpesa', label: 'M-Pesa', hint: 'Paid to your Safaricom number' },
  { id: 'bank', label: 'Bank transfer', hint: 'Paid to your bank account' },
];

export function PayoutForm({
  method: initialMethod,
  details,
}: {
  method: string | null;
  details: Record<string, string> | null;
}) {
  const [method, setMethod] = useState<Method>(initialMethod === 'bank' ? 'bank' : 'mpesa');
  const [values, setValues] = useState({
    phone: details?.phone ?? '',
    account_name: details?.account_name ?? '',
    bank_name: details?.bank_name ?? '',
    account_number: details?.account_number ?? '',
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
          : { bank_name: values.bank_name, account_name: values.account_name, account_number: values.account_number },
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      <fieldset>
        <legend className="sr-only">Payout method</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((o) => (
            <label
              key={o.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-700 ${
                method === o.id ? 'border-teal-800 bg-teal-50' : 'border-neutral-300 bg-white hover:bg-neutral-50'
              }`}
            >
              <input
                type="radio"
                name="payout_method"
                value={o.id}
                checked={method === o.id}
                onChange={() => setMethod(o.id)}
                className="mt-0.5 accent-teal-800"
              />
              <span>
                <span className="block font-medium text-neutral-900">{o.label}</span>
                <span className="block text-neutral-500">{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {method === 'mpesa' ? (
        <Field label="M-Pesa number" htmlFor="payout_phone">
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
      ) : (
        <>
          <Field label="Bank name" htmlFor="bank_name">
            <input id="bank_name" className={inputClass} value={values.bank_name} onChange={set('bank_name')} required />
          </Field>
          <Field label="Account number" htmlFor="account_number">
            <input
              id="account_number"
              inputMode="numeric"
              className={inputClass}
              value={values.account_number}
              onChange={set('account_number')}
              required
            />
          </Field>
        </>
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