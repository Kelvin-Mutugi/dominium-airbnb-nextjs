'use client';

import { LoaderCircle } from 'lucide-react';
import { useFormStatus } from 'react-dom';

export function SupportSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-[#1B1A2E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#302F43] disabled:cursor-wait disabled:opacity-75"
    >
      {pending && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Sending…' : 'Send request'}
    </button>
  );
}