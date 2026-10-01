'use client';

import { LoaderCircle } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { btnPrimary } from './ui';

export function SupportSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${btnPrimary} min-w-36 disabled:cursor-wait`}
    >
      {pending && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Sending…' : 'Send request'}
    </button>
  );
}