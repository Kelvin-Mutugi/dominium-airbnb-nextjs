'use client';

import { useState } from 'react';
import { btnPrimary, btnSecondary } from './ui';

export function PaymentRecoveryButton({
  bookingId,
  authorizationUrl,
  method,
}: {
  bookingId: string;
  authorizationUrl: string | null;
  method: string | null;
}) {
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>(method === 'card' ? 'card' : 'mpesa');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkoutUrl = authorizationUrl?.startsWith('https://') ? authorizationUrl : null;

  async function retryPayment() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/payments/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, paymentMethod }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.authorization_url !== 'string' || !result.authorization_url.startsWith('https://')) {
        setError(result.error ?? 'Unable to restart payment. Try again or contact support.');
        return;
      }
      window.location.assign(result.authorization_url);
    } catch {
      setError('Unable to reach the payment service. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {checkoutUrl ? (
        <a href={checkoutUrl} className={btnSecondary}>Continue payment</a>
      ) : (
        <>
          <label className="sr-only" htmlFor={`payment-method-${bookingId}`}>Payment method</label>
          <select id={`payment-method-${bookingId}`} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'mpesa' | 'card')} className="rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-sm text-neutral-800 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20">
            <option value="mpesa">M-Pesa</option>
            <option value="card">Card</option>
          </select>
          <button type="button" onClick={retryPayment} disabled={pending} className={`${btnPrimary} !py-2`}>
            {pending ? 'Opening secure checkout…' : 'Retry payment'}
          </button>
        </>
      )}
      {error && <p role="alert" className="w-full text-sm text-rose-700">{error}</p>}
    </div>
  );
}