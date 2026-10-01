// FILE LOCATION: components/account/ui.tsx
// Put this file at components/account/ui.tsx in your project root (or src/components/account/ui.tsx if your project has a src/ folder).

import Link from 'next/link';
import type { ReactNode } from 'react';
import { initials } from '@/app/lib/format';
import type { ActionResult } from '@/types/account';

/* ---------- shared class strings ---------- */

export const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85]';

export const inputClass =
  'block min-h-11 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-[#1B1A2E] shadow-[0_1px_4px_rgba(27,26,46,0.08),inset_1px_1px_2px_rgba(27,26,46,0.025)] placeholder:text-[#777583] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/30 disabled:bg-neutral-100 disabled:text-neutral-500';

export const btnPrimary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#1B1A2E] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(27,26,46,0.12)] transition-all hover:bg-[#302F43] hover:shadow-[3px_3px_7px_rgba(27,26,46,0.12),-2px_-2px_6px_rgba(255,255,255,0.4)] active:bg-[#11101F] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none ${focusRing}`;

export const btnSecondary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[#1B1A2E] transition-all hover:bg-neutral-50 hover:shadow-[3px_3px_7px_rgba(27,26,46,0.06),-3px_-3px_7px_rgba(255,255,255,0.9)] active:bg-neutral-100 active:shadow-[inset_2px_2px_4px_rgba(27,26,46,0.05)] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none ${focusRing}`;

export const btnDanger = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#9C2454] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(156,36,84,0.12)] transition-all hover:bg-[#831D46] hover:shadow-[3px_3px_7px_rgba(27,26,46,0.10),-2px_-2px_6px_rgba(255,255,255,0.35)] active:bg-[#6F183B] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.16)] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none ${focusRing}`;

export const textLink = `min-h-11 inline-flex items-center text-sm font-semibold text-[#9C2454] underline underline-offset-2 hover:text-[#7E1C44] ${focusRing}`;

/* ---------- layout pieces ---------- */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 pb-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-2xl text-[#1B1A2E] sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-prose text-sm leading-6 text-neutral-600">{description}</p>}
      </div>
      {action && <div className="w-full sm:w-auto">{action}</div>}
    </header>
  );
}

/** Settings-style block: title on the left, content on the right, ruled rather than boxed. */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3 py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8 md:py-7 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="font-serif text-lg text-neutral-900">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-neutral-500">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function StatStrip({ items }: { items: { label: string; value: ReactNode }[] }) {
  const cols = items.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4';
  return (
    <dl className={`grid ${cols} gap-2`}>
      {items.map((item) => (
        <div key={item.label} className="account-neu-surface min-w-0 rounded-2xl px-4 py-3 sm:px-5 sm:py-4">
          <dt className="text-xs leading-5 text-neutral-600 sm:text-sm">{item.label}</dt>
          <dd className="mt-1 break-words font-serif text-xl text-neutral-900 sm:text-2xl">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="account-neu-surface rounded-3xl px-5 py-10 text-center sm:px-6 sm:py-12">
      <p className="font-serif text-lg text-neutral-900">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">{body}</p>
      {href && cta && (
        <Link href={href} className={`${btnPrimary} mt-5`}>
          {cta}
        </Link>
      )}
    </div>
  );
}

/* ---------- small atoms ---------- */

const TONES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-900',
  owed: 'bg-amber-50 text-amber-900',
  confirmed: 'bg-[#FCE8F0] text-[#9C2454]',
  paid: 'bg-[#FCE8F0] text-[#9C2454]',
  success: 'bg-[#FCE8F0] text-[#9C2454]',
  active: 'bg-[#FCE8F0] text-[#9C2454]',
  completed: 'bg-neutral-100 text-neutral-700',
  refunded: 'bg-neutral-100 text-neutral-700',
  cancelled: 'bg-rose-50 text-[#9C2454]',
  failed: 'bg-rose-50 text-[#9C2454]',
  suspended: 'bg-rose-50 text-[#9C2454]',
  expired: 'bg-neutral-100 text-neutral-700',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = TONES[status] ?? TONES.completed;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${tone}`}
    >
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}

export function StarIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width={size} height={size} className={className} aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className={n <= rating ? 'text-amber-500' : 'text-neutral-300'} />
      ))}
    </span>
  );
}

export function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'h-24 w-24 text-3xl' : 'h-14 w-14 text-lg';
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${dims} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full bg-[#9C2454] font-serif text-white`}
    >
      {initials(name)}
    </span>
  );
}

/* ---------- forms ---------- */

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-neutral-800">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-neutral-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return result.ok ? (
    <p role="status" className="text-sm text-[#9C2454]">
      {result.message ?? 'Saved.'}
    </p>
  ) : (
    <p role="alert" className="text-sm text-[#9C2454]">
      {result.error}
    </p>
  );
}